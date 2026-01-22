import { Client } from '@notionhq/client';
import { NextRequest, NextResponse } from 'next/server';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
    try {
          const data = await request.json();
          const response = await notion.pages.create({
                  parent: { database_id: DATABASE_ID },
                  properties: {
                            '法人名': { title: [{ text: { content: data.companyName || '' } }] },
                            'スコア': { number: data.score || 0 },
                            'ランク': data.rank ? { select: { name: data.rank } } : undefined,
                            'ステータス': { select: { name: '新規' } },
                  },
          });
          return NextResponse.json({ success: true, id: response.id }, { headers: corsHeaders });
    } catch (error) {
          return NextResponse.json({ success: false }, { status: 500, headers: corsHeaders });
    }
}
