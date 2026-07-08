import { NextResponse } from 'next/server'
import { getDocuSignAccessToken } from '@/lib/docusign-auth'

export async function GET() {
  try {
    const token = await getDocuSignAccessToken()
    return NextResponse.json({
      success: true,
      tokenPreview: token.substring(0, 20) + '...', // pura token nahi dikha rahe, security ke liye
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}