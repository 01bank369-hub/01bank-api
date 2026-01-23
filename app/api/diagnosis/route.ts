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

        const properties: Record<string, any> = {
                  '法人名': { title: [{ text: { content: data.companyName || '未入力' } }] },
                  'ステータス': { select: { name: '新規' } },
        };

        if (data.score !== undefined && data.score !== null) {
                  properties['スコア'] = { number: Number(data.score) };
        }

        if (data.rank) {
                  properties['ランク'] = { select: { name: data.rank } };
        }

                              const response = await notion.pages.create({
                                        parent: { database_id: DATABASE_ID },
                                        properties: properties,
                              });

        return NextResponse.json(
            { success: true, id: response.id },
            { headers: corsHeaders }
                );
      } catch (error: any) {
              console.error('Notion API Error:', error?.message || error);
              return NextResponse.json(
                  { success: false, error: error?.message || 'Unknown error' },
                  { status: 500, headers: corsHeaders }
                      );
      }
}
