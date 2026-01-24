import { Client } from '@notionhq/client';
import { NextRequest, NextResponse } from 'next/server';

const notion = new Client({
          auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_USER_ID = process.env.LINE_USER_ID;

// CORS headers
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

            // Notionにデータを保存
            const notionResponse = await notion.pages.create({
                          parent: { database_id: DATABASE_ID },
                          properties: {
                                          // 基本情報（STEP 1）
                            '法人名': {
                                              title: [{ text: { content: data.companyName || '' } }],
                            },
                                          '法人番号': {
                                                            rich_text: [{ text: { content: data.corporateNumber || '' } }],
                                          },
                                          '設立年月日': data.establishedDate ? {
                                                            date: { start: data.establishedDate },
                                          } : undefined,
                                          '資本金': data.capital ? {
                                                            select: { name: getCapitalLabel(data.capital) },
                                          } : undefined,
                                          '代表者名': {
                                                            rich_text: [{ text: { content: data.representativeName || '' } }],
                                          },

                                          // 事業内容（STEP 2）
                                          '業種': data.industry ? {
                                                            select: { name: getIndustryLabel(data.industry) },
                                          } : undefined,
                                          '事業内容': {
                                                            rich_text: [{ text: { content: data.businessDescription || '' } }],
                                          },
                                          '事業年数': data.businessYears ? {
                                                            select: { name: getBusinessYearsLabel(data.businessYears) },
                                          } : undefined,
                                          '年商': data.annualRevenue ? {
                                                            select: { name: getAnnualRevenueLabel(data.annualRevenue) },
                                          } : undefined,
                                          '直近の月商': data.monthlyRevenue ? {
                                                            number: parseInt(data.monthlyRevenue),
                                          } : undefined,
                                          '主な売掛先': data.clientType ? {
                                                            select: { name: getClientTypeLabel(data.clientType) },
                                          } : undefined,
                                          '売掛先の業種': {
                                                            rich_text: [{ text: { content: data.clientIndustry || '' } }],
                                          },
                                          'HP/Webサイト': data.hasWebsite ? {
                                                            select: { name: data.hasWebsite === 'yes' ? 'あり' : 'なし' },
                                          } : undefined,
                                          'オフィス形態': data.officeType ? {
                                                            select: { name: getOfficeTypeLabel(data.officeType) },
                                          } : undefined,
                                          '売上管理口座': data.accountType ? {
                                                            select: { name: getAccountTypeLabel(data.accountType) },
                                          } : undefined,

                                          // 財務状況（STEP 3）
                                          '直近の決算状況': data.profitStatus ? {
                                                            select: { name: getProfitStatusLabel(data.profitStatus) },
                                          } : undefined,
                                          'クレジットカード決済比率': data.ccRatio !== undefined ? {
                                                            number: parseInt(data.ccRatio),
                                          } : undefined,
                                          '現金売上比率': data.cashRatio !== undefined ? {
                                                            number: parseInt(data.cashRatio),
                                          } : undefined,
                                          '主要取引銀行': data.mainBank ? {
                                                            select: { name: getMainBankLabel(data.mainBank) },
                                          } : undefined,
                                          '資金使途': data.fundUsage ? {
                                                            select: { name: getFundUsageLabel(data.fundUsage) },
                                          } : undefined,
                                          'スマホ分割・リボ残高': data.hasRevolving ? {
                                                            select: { name: data.hasRevolving === 'yes' ? 'あり' : 'なし' },
                                          } : undefined,

                                          // 個人信用情報（STEP 4）
                                          '住宅ローン有無': data.hasHomeLoan ? {
                                                            select: { name: data.hasHomeLoan === 'yes' ? 'あり（返済中）' : 'なし' },
                                          } : undefined,
                                          'カードローン・キャッシング利用': data.personalLoan ? {
                                                            select: { name: getPersonalLoanLabel(data.personalLoan) },
                                          } : undefined,

                                          // 審査関連（STEP 5）
                                          '税金の滞納状況': data.taxStatus ? {
                                                            select: { name: getTaxStatusLabel(data.taxStatus) },
                                          } : undefined,
                                          '社会保険の滞納状況': data.siStatus ? {
                                                            select: { name: getSiStatusLabel(data.siStatus) },
                                          } : undefined,
                                          '他社からの借入状況': data.otherLoan ? {
                                                            select: { name: getOtherLoanLabel(data.otherLoan) },
                                          } : undefined,
                                          '他社での否決歴': data.rejectionHistory ? {
                                                            select: { name: getRejectionHistoryLabel(data.rejectionHistory) },
                                          } : undefined,
                                          '直近3ヶ月以内の他行申込': data.recentApplications ? {
                                                            select: { name: getRecentApplicationsLabel(data.recentApplications) },
                                          } : undefined,
                                          '当社6ヶ月以内申込なし確認': {
                                                            checkbox: data.noRecentApplication === true,
                                          },

                                          // 診断結果
                                          'スコア': {
                                                            number: data.score || 0,
                                          },
                                          'ランク': data.rank ? {
                                                            select: { name: data.rank },
                                          } : undefined,
                                          '想定融資額': {
                                                            rich_text: [{ text: { content: data.amount || '' } }],
                                          },
                                          'ステータス': {
                                                            status: { name: '新規' },
                                          },
                          },
            });

            // Aランクの場合、LINE通知を送信
            if (data.rank === 'A' && LINE_CHANNEL_ACCESS_TOKEN && LINE_USER_ID) {
                          await sendLineMessage(data);
            }

            return NextResponse.json(
                    { success: true, id: notionResponse.id },
                    { headers: corsHeaders }
                        );
          } catch (error) {
                      console.error('Error:', error);
                      return NextResponse.json(
                              { success: false, error: 'Internal Server Error' },
                              { status: 500, headers: corsHeaders }
                                  );
          }
}

// LINE メッセージ送信
async function sendLineMessage(data: any) {
          const message = `【Aランク案件】新規診断完了

          法人名: ${data.companyName}
          代表者: ${data.representativeName}
          業種: ${getIndustryLabel(data.industry)}
          年商: ${getAnnualRevenueLabel(data.annualRevenue)}
          スコア: ${data.score}点

          ▼ 仮審査申込フォーム
          https://forms.gle/xxxxx`;

  await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                            to: LINE_USER_ID,
                            messages: [{ type: 'text', text: message }],
              }),
  });
}

// ラベル変換関数
function getCapitalLabel(value: string): string {
          const map: Record<string, string> = {
                      'under100': '100万円未満',
                      '100-300': '100万円〜300万円',
                      '300-1000': '300万円〜1,000万円',
                      'over1000': '1,000万円以上',
          };
          return map[value] || value;
}

function getIndustryLabel(value: string): string {
          const map: Record<string, string> = {
                      'construction': '建設業',
                      'transport': '運送業',
                      'it': 'IT・情報通信',
                      'food': '飲食業',
                      'retail': '小売業',
                      'manufacturing': '製造業',
                      'service': 'サービス業',
                      'consulting': 'コンサル・広告',
                      'broker': '紹介業・仲介業',
                      'staffing': '人材紹介・業務委託',
                      'payment': '決済代行',
                      'night': 'ナイト関連',
                      'crypto': '投資助言・暗号資産・FX関連',
                      'matching': 'マッチング・ライブ配信',
                      'other': 'その他',
          };
          return map[value] || value;
}

function getBusinessYearsLabel(value: string): string {
          const map: Record<string, string> = {
                      'under1': '1年未満',
                      '1-3': '1〜3年',
                      '3-5': '3〜5年',
                      'over5': '5年以上',
          };
          return map[value] || value;
}

function getAnnualRevenueLabel(value: string): string {
          const map: Record<string, string> = {
                      'under10m': '1,000万円未満',
                      '10-30m': '1,000万円〜3,000万円',
                      '30-100m': '3,000万円〜1億円',
                      'over100m': '1億円以上',
          };
          return map[value] || value;
}

function getClientTypeLabel(value: string): string {
          const map: Record<string, string> = {
                      'corporate': '法人（中小企業）',
                      'individual': '個人',
                      'listed': '上場企業',
                      'government': '官公庁・自治体',
                      'mixed': '混在',
          };
          return map[value] || value;
}

function getOfficeTypeLabel(value: string): string {
          const map: Record<string, string> = {
                      'real': '実オフィス',
                      'virtual': 'バーチャルオフィス',
                      'home': '自宅兼事務所',
          };
          return map[value] || value;
}

function getAccountTypeLabel(value: string): string {
          const map: Record<string, string> = {
                      'corporate': '法人口座',
                      'personal': '個人口座',
                      'both': '両方',
          };
          return map[value] || value;
}

function getProfitStatusLabel(value: string): string {
          const map: Record<string, string> = {
                      'profit': '黒字',
                      'loss-temp': '赤字（一時的）',
                      'loss-cont': '赤字（継続）',
          };
          return map[value] || value;
}

function getMainBankLabel(value: string): string {
          const map: Record<string, string> = {
                      'mega': 'メガバンク',
                      'regional': '地方銀行',
                      'shinkin': '信用金庫',
                      'online': 'ネット銀行',
                      'none': 'なし',
          };
          return map[value] || value;
}

function getFundUsageLabel(value: string): string {
          const map: Record<string, string> = {
                      'working': '運転資金',
                      'equipment': '設備投資',
                      'tax': '納税資金',
                      'bridge': 'つなぎ資金',
                      'other': 'その他',
          };
          return map[value] || value;
}

function getPersonalLoanLabel(value: string): string {
          const map: Record<string, string> = {
                      'none': 'なし',
                      'under50': 'あり（枠の50%未満）',
                      'over50': 'あり（枠の50%以上）',
          };
          return map[value] || value;
}

function getTaxStatusLabel(value: string): string {
          const map: Record<string, string> = {
                      'paid': '完納',
                      'installment': '分納中',
                      'unpaid': '未納',
                      'seized': '差押え履歴あり',
          };
          return map[value] || value;
}

function getSiStatusLabel(value: string): string {
          const map: Record<string, string> = {
                      'paid': '完納',
                      'installment': '分納中',
                      'unpaid': '未納',
          };
          return map[value] || value;
}

function getOtherLoanLabel(value: string): string {
          const map: Record<string, string> = {
                      'none': 'なし',
                      'repaying': 'あり（返済中）',
                      'delayed': 'あり（遅延中）',
          };
          return map[value] || value;
}

function getRejectionHistoryLabel(value: string): string {
          const map: Record<string, string> = {
                      'none': 'なし',
                      'within6m': 'あり（6ヶ月以内）',
                      'over6m': 'あり（6ヶ月以上前）',
          };
          return map[value] || value;
}

function getRecentApplicationsLabel(value: string): string {
          const map: Record<string, string> = {
                      'none': 'なし',
                      'one': '1社',
                      'multiple': '2社以上',
          };
          return map[value] || value;
}
