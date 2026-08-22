import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyB9NmB32WUeUSfy2EsgrakLh8akhpLpa4E',
  authDomain: 'expense-tracker-e73a6.firebaseapp.com',
  databaseURL:
    'https://expense-tracker-e73a6-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'expense-tracker-e73a6',
  storageBucket: 'expense-tracker-e73a6.firebasestorage.app',
  messagingSenderId: '629901886445',
  appId: '1:629901886445:web:04f5e42cd7d15b9e7b5de4',
}

export const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const DB_URL = firebaseConfig.databaseURL
