"use client";

/**
 * The Firestore side of chat.
 *
 * The browser subscribes to messages directly — that is what makes a chat live
 * — so it has to be signed in to Firebase as itself. Our own login issues our
 * own JWT, which Firebase has never heard of, so the backend mints a custom
 * token and this exchanges it for a real Firebase session. Only then do the
 * security rules see a uid they can check against the conversation.
 *
 * Everything here loads lazily: Firebase is a large dependency and most pages
 * never touch chat.
 */

import type { FirebaseApp } from "firebase/app";
import type { Firestore, Timestamp } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isChatConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId);
}

let appPromise: Promise<FirebaseApp> | null = null;

async function getApp(): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = (async () => {
      const { getApps, initializeApp } = await import("firebase/app");
      const existing = getApps();
      return existing.length ? existing[0] : initializeApp(config);
    })();
  }
  return appPromise;
}

export async function getDb(): Promise<Firestore> {
  const { getFirestore } = await import("firebase/firestore");
  return getFirestore(await getApp());
}

/** Signs in to Firebase with the token our backend minted. */
export async function signInToChat(customToken: string, uid: string): Promise<void> {
  const { getAuth, signInWithCustomToken } = await import("firebase/auth");
  const auth = getAuth(await getApp());

  // Already the right person — re-signing in would churn the session and drop
  // every live listener for a moment.
  if (auth.currentUser?.uid === uid) return;

  await signInWithCustomToken(auth, customToken);
}

export type ChatMessage = {
  id: string;
  senderUid: string;
  text: string;
  /** Null for a moment on the sender's own screen: the server stamps the time,
   *  so it arrives with the echo rather than with the write. */
  sentAt: Date | null;
  pending: boolean;
};

/**
 * Subscribes to a conversation. Returns the unsubscribe function.
 *
 * `includeMetadataChanges` is on so a message the user just sent appears
 * immediately, marked pending, instead of after the server round-trip.
 */
export async function watchMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): Promise<() => void> {
  const { collection, onSnapshot, orderBy, query, limit } = await import("firebase/firestore");
  const db = await getDb();

  const messages = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("sentAt", "asc"),
    limit(500),
  );

  return onSnapshot(
    messages,
    { includeMetadataChanges: true },
    (snapshot) => {
      onChange(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          const sentAt = data.sentAt as Timestamp | null;
          return {
            id: doc.id,
            senderUid: data.senderUid as string,
            text: data.text as string,
            sentAt: sentAt ? sentAt.toDate() : null,
            pending: doc.metadata.hasPendingWrites,
          };
        }),
      );
    },
    (error) => onError(error),
  );
}

/**
 * Sends one message.
 *
 * The time is `serverTimestamp()` because the rules insist on it — a
 * client-set time could reorder the transcript. If the conversation has been
 * closed, this is refused by the rules, not by any check here.
 */
export async function sendMessage(
  conversationId: string,
  senderUid: string,
  text: string,
): Promise<void> {
  const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
  const db = await getDb();

  await addDoc(collection(db, "conversations", conversationId, "messages"), {
    senderUid,
    text,
    sentAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------- receipts

export type ReadMarker = {
  uid: string;
  deliveredAt: Date | null;
  readAt: Date | null;
};

/** How far a message has got, WhatsApp-style. */
export type DeliveryState = "pending" | "sent" | "delivered" | "read";

/**
 * Works out a message's tick from the other person's markers.
 *
 * The comparison is against *their* timestamps rather than anything stored on
 * the message, which is why marking a long conversation read costs one small
 * write instead of one per message.
 */
export function deliveryStateOf(
  message: ChatMessage,
  peerMarker: ReadMarker | null,
): DeliveryState {
  if (message.pending || !message.sentAt) return "pending";
  if (!peerMarker) return "sent";
  if (peerMarker.readAt && peerMarker.readAt >= message.sentAt) return "read";
  if (peerMarker.deliveredAt && peerMarker.deliveredAt >= message.sentAt) return "delivered";
  return "sent";
}

/** Subscribes to both participants' read markers. */
export async function watchReads(
  conversationId: string,
  onChange: (markers: Record<string, ReadMarker>) => void,
): Promise<() => void> {
  const { collection, onSnapshot } = await import("firebase/firestore");
  const db = await getDb();

  return onSnapshot(
    collection(db, "conversations", conversationId, "reads"),
    (snapshot) => {
      const markers: Record<string, ReadMarker> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        markers[doc.id] = {
          uid: doc.id,
          deliveredAt: data.deliveredAt?.toDate?.() ?? null,
          readAt: data.readAt?.toDate?.() ?? null,
        };
      });
      onChange(markers);
    },
    () => {
      /* receipts are a nicety — never break the chat over them */
    },
  );
}

/**
 * Says how far this person has got.
 *
 * `delivered` means their app has the messages; `read` means they were
 * actually looking. Both are written with the server's clock, which the rules
 * insist on — otherwise a wrong device clock could mark a message read before
 * it was sent.
 */
export async function markProgress(
  conversationId: string,
  uid: string,
  level: "delivered" | "read",
): Promise<void> {
  const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");
  const db = await getDb();

  // Reading implies delivery, so that writes both and avoids a state where a
  // message shows blue ticks without ever having shown grey ones.
  const payload =
    level === "read"
      ? { deliveredAt: serverTimestamp(), readAt: serverTimestamp() }
      : { deliveredAt: serverTimestamp() };

  await setDoc(doc(db, "conversations", conversationId, "reads", uid), payload, {
    merge: true,
  });
}
