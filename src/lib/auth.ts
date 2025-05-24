// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = process.env.AUTH_SECRET;

if (!secretKey) {
  throw new Error('AUTH_SECRET environment variable is required');
}

const key = new TextEncoder().encode(secretKey);

// Session duration: 1 week
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface SessionPayload {
  userId: string;
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  if (!input) {
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    console.error('Failed to decrypt session:', error);
    return null;
  }
}

export async function login(formData: FormData) {
  // Verify credentials
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  
  if (!verifyCredentials(username, password)) {
    return {
      success: false,
      message: 'Invalid credentials'
    };
  }

  // Create the session
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const session = await encrypt({ userId: username, expiresAt });

  // Save the session in a cookie
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    expires: expiresAt,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return {
    success: true,
    message: 'Login successful'
  };
}

export async function logout() {
  // Destroy the session by setting an expired cookie
  const cookieStore = await cookies();
  cookieStore.set('session', '', { 
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  
  try {
    return await decrypt(session);
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;

  try {
    // Refresh the session so it doesn't expire
    const parsed = await decrypt(session);
    if (!parsed) return;
    
    const expiresAt = new Date(Date.now() + SESSION_DURATION);
    parsed.expiresAt = expiresAt;
    const res = NextResponse.next();
    res.cookies.set({
      name: 'session',
      value: await encrypt(parsed),
      expires: expiresAt,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('Failed to update session:', error);
    return;
  }
}

function verifyCredentials(username: string, password: string): boolean {
  // Get credentials from environment variables
  const validUsername = process.env.AUTH_USERNAME;
  const validPassword = process.env.AUTH_PASSWORD;
  
  if (!validUsername || !validPassword) {
    console.error('AUTH_USERNAME and AUTH_PASSWORD must be set in environment variables');
    return false;
  }
  
  return username === validUsername && password === validPassword;
}