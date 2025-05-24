// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await login(formData);
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 401
    });
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}