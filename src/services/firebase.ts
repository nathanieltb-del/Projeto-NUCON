import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Sign in anonymously to establish a secure Firebase Auth context
// so request.auth evaluates to true in Firestore security rules.
signInAnonymously(auth)
  .then(() => {
    console.log('Firebase Auth signed in anonymously successfully');
  })
  .catch((err) => {
    console.error('Firebase Auth sign in failed:', err);
  });
