import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import Note from './src/models/Note.js';

dotenv.config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

const runTests = async () => {
  console.log(`Starting NoteStack test suite against ${BASE_URL}...`);

  // 1. Health Check
  console.log('\n--- 1. Testing GET /api/health ---');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  console.log('Health status:', healthRes.status, healthData);
  if (healthRes.status !== 200 || healthData.status !== 'ok') {
    throw new Error('Health check failed');
  }

  // Generate test credentials
  const timestamp = Date.now();
  const testEmail1 = `user1_${timestamp}@example.com`;
  const testEmail2 = `user2_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  // 2. Signup Validation: short password
  console.log('\n--- 2. Testing Signup Validation (short password) ---');
  const shortPassRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail1, password: 'short' }),
  });
  const shortPassData = await shortPassRes.json();
  console.log('Short pass response:', shortPassRes.status, shortPassData);
  if (shortPassRes.status !== 400 || !shortPassData.error) {
    throw new Error('Short password check failed');
  }

  // 3. Signup User 1
  console.log('\n--- 3. Testing Signup User 1 ---');
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail1, password: testPassword }),
  });
  const signupData = await signupRes.json();
  console.log('Signup 1 response:', signupRes.status, signupData);
  if (
    signupRes.status !== 201 ||
    !signupData.token ||
    !signupData.user ||
    !signupData.user.id ||
    signupData.user.email !== testEmail1.toLowerCase() ||
    signupData.user.passwordHash
  ) {
    throw new Error('Signup 1 failed');
  }
  const token1 = signupData.token;
  const user1Id = signupData.user.id;

  // 4. Duplicate Signup
  console.log('\n--- 4. Testing Duplicate Signup ---');
  const dupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail1, password: testPassword }),
  });
  const dupData = await dupRes.json();
  console.log('Duplicate signup response:', dupRes.status, dupData);
  if (dupRes.status !== 400 || !dupData.error) {
    throw new Error('Duplicate email check failed');
  }

  // 5. Signup User 2
  console.log('\n--- 5. Testing Signup User 2 ---');
  const signup2Res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail2, password: testPassword }),
  });
  const signup2Data = await signup2Res.json();
  const token2 = signup2Data.token;

  // 6. Login with Wrong Password
  console.log('\n--- 6. Testing Login (Wrong Password) ---');
  const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail1, password: 'WrongPassword' }),
  });
  const wrongLoginData = await wrongLoginRes.json();
  console.log('Wrong login response:', wrongLoginRes.status, wrongLoginData);
  if (wrongLoginRes.status !== 401 || !wrongLoginData.error) {
    throw new Error('Invalid login check failed');
  }

  // 7. Login with Valid Credentials
  console.log('\n--- 7. Testing Login (Valid Credentials) ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail1, password: testPassword }),
  });
  const loginData = await loginRes.json();
  console.log('Login response:', loginRes.status, loginData);
  if (loginRes.status !== 200 || !loginData.token || loginData.user.email !== testEmail1.toLowerCase()) {
    throw new Error('Login failed');
  }

  // 8. Auth Middleware Protection
  console.log('\n--- 8. Testing Protected Notes Route without Token ---');
  const noAuthRes = await fetch(`${BASE_URL}/api/notes`);
  const noAuthData = await noAuthRes.json();
  console.log('No auth response:', noAuthRes.status, noAuthData);
  if (noAuthRes.status !== 401) {
    throw new Error('Protected route allowed unauthenticated request');
  }

  // 9. Create Notes for User 1
  console.log('\n--- 9. Testing Create Note for User 1 ---');
  const createNote1Res = await fetch(`${BASE_URL}/api/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      title: 'User 1 First Note',
      body: 'This is note 1 content',
    }),
  });
  const note1 = await createNote1Res.json();
  console.log('Create note 1 response:', createNote1Res.status, note1);
  if (createNote1Res.status !== 201 || !note1.id || note1.title !== 'User 1 First Note') {
    throw new Error('Create note failed');
  }

  const createNote2Res = await fetch(`${BASE_URL}/api/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      title: 'User 1 Second Note',
      body: 'This is note 2 content',
    }),
  });
  const note2 = await createNote2Res.json();

  // 10. List Notes for User 1 (newest first)
  console.log('\n--- 10. Testing List Notes for User 1 (newest first) ---');
  const listNotesRes = await fetch(`${BASE_URL}/api/notes`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const notesList = await listNotesRes.json();
  console.log('Notes list length:', notesList.length, 'First note title:', notesList[0]?.title);
  if (notesList.length < 2 || notesList[0].id !== note2.id) {
    throw new Error('Notes list or ordering check failed');
  }

  // 11. Cross-User Isolation (User 2 tries to GET User 1 note)
  console.log('\n--- 11. Testing Cross-User Isolation (User 2 accesses User 1 Note) ---');
  const crossGetRes = await fetch(`${BASE_URL}/api/notes/${note1.id}`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const crossGetData = await crossGetRes.json();
  console.log('Cross user GET response:', crossGetRes.status, crossGetData);
  if (crossGetRes.status !== 404) {
    throw new Error('Cross-user isolation check failed on GET');
  }

  // 12. Cross-User Isolation (User 2 tries to PUT User 1 note)
  console.log('\n--- 12. Testing Cross-User Isolation (User 2 updates User 1 Note) ---');
  const crossPutRes = await fetch(`${BASE_URL}/api/notes/${note1.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
    },
    body: JSON.stringify({ title: 'Hacked Title' }),
  });
  console.log('Cross user PUT response:', crossPutRes.status);
  if (crossPutRes.status !== 404) {
    throw new Error('Cross-user isolation check failed on PUT');
  }

  // 13. Update Note by Owner
  console.log('\n--- 13. Testing Update Note by Owner ---');
  const updateRes = await fetch(`${BASE_URL}/api/notes/${note1.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      title: 'User 1 First Note (Updated)',
      body: 'Updated body content',
    }),
  });
  const updatedNote = await updateRes.json();
  console.log('Update response:', updateRes.status, updatedNote.title);
  if (updateRes.status !== 200 || updatedNote.title !== 'User 1 First Note (Updated)') {
    throw new Error('Update note failed');
  }

  // 14. Delete Note
  console.log('\n--- 14. Testing Delete Note ---');
  const deleteRes = await fetch(`${BASE_URL}/api/notes/${note1.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token1}` },
  });
  const deleteData = await deleteRes.json();
  console.log('Delete response:', deleteRes.status, deleteData);
  if (deleteRes.status !== 200) {
    throw new Error('Delete note failed');
  }

  // Verify it is gone (404)
  const verifyDeleteRes = await fetch(`${BASE_URL}/api/notes/${note1.id}`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log('Verify deleted response:', verifyDeleteRes.status);
  if (verifyDeleteRes.status !== 404) {
    throw new Error('Deleted note still accessible');
  }

  // 15. Clean up test users & notes from DB
  console.log('\n--- 15. Cleaning up test data from DB ---');
  await Note.deleteMany({ owner: { $in: [user1Id, signup2Data.user.id] } });
  await User.deleteMany({ email: { $in: [testEmail1.toLowerCase(), testEmail2.toLowerCase()] } });
  console.log('Test data cleaned up.');

  console.log('\n========================================');
  console.log(' ALL 15 BACKEND TESTS PASSED PERFECTLY! ');
  console.log('========================================\n');
};

// Connect DB for cleanup and run
const main = async () => {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URI;
  await mongoose.connect(MONGO_URI);
  try {
    await runTests();
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

main().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
