import { getClaudeClient } from '@/lib/claude'
import type { ScholarshipInsert } from '@/types/scholarship'

const EXTRACTION_TOOL = {
  name: 'save_scholarship' as const,
  description: 'Save extracted scholarship data',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Name of the scholarship' },
      provider: { type: 'string', description: 'Organization offering it' },
      amount_min: { type: 'number', description: 'Minimum amount in cents' },
      amount_max: { type: 'number', description: 'Maximum amount in cents' },
      amount_description: {
        type: 'string',
        description: 'Human-readable amount (e.g., "$5,000/year", "Full tuition")',
      },
      deadline: {
        type: 'string',
        description: 'Application deadline in YYYY-MM-DD format',
      },
      description: { type: 'string', description: 'Description of the scholarship' },
      eligibility: {
        type: 'object',
        description: 'Structured eligibility criteria',
        properties: {
          gpa_min: { type: 'number' },
          states: { type: 'array', items: { type: 'string' } },
          citizenship: { type: 'array', items: { type: 'string' } },
          majors: { type: 'array', items: { type: 'string' } },
          gender: { type: 'string' },
          ethnicities: { type: 'array', items: { type: 'string' } },
          graduation_years: { type: 'array', items: { type: 'number' } },
          sports: { type: 'array', items: { type: 'string' } },
          financial_need: { type: 'boolean' },
          schools: { type: 'array', items: { type: 'string' } },
          min_sat: { type: 'number' },
          min_act: { type: 'number' },
          custom: { type: 'array', items: { type: 'string' } },
        },
      },
      requirements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Application requirements (e.g., essay, transcript)',
      },
      renewable: { type: 'boolean' },
      renewable_details: { type: 'string' },
      category: {
        type: 'array',
        items: { type: 'string' },
        description: 'Categories (e.g., nursing, STEM, athletics)',
      },
    },
    required: ['name'],
  },
}

export interface ExtractionResult {
  scholarship: Partial<ScholarshipInsert>
  confidence: number
}

export async function extractScholarshipFromContent(
  url: string,
  htmlContent: string
): Promise<ExtractionResult> {
  const claude = getClaudeClient()

  // Trim HTML to text content, remove scripts/styles
  const textContent = htmlContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000) // Limit input size

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    tools: [EXTRACTION_TOOL],
    messages: [
      {
        role: 'user',
        content: `Extract scholarship information from this webpage content. Use the save_scholarship tool to return the structured data. Convert dollar amounts to cents (e.g., $5,000 = 500000). If information is not available, omit that field.

URL: ${url}

Page content:
${textContent}`,
      },
    ],
  })

  const toolUse = response.content.find((block) => block.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude did not return structured data')
  }

  const extracted = toolUse.input as Record<string, unknown>

  return {
    scholarship: {
      name: (extracted.name as string) || 'Unknown Scholarship',
      provider: extracted.provider as string | null,
      amount_min: extracted.amount_min as number | null,
      amount_max: extracted.amount_max as number | null,
      amount_description: extracted.amount_description as string | null,
      deadline: extracted.deadline as string | null,
      url,
      description: extracted.description as string | null,
      eligibility: (extracted.eligibility as Record<string, unknown>) || {},
      requirements: (extracted.requirements as string[]) || [],
      renewable: (extracted.renewable as boolean) || false,
      renewable_details: extracted.renewable_details as string | null,
      category: (extracted.category as string[]) || [],
      source: 'manual',
      source_id: url,
      status: 'active',
      last_verified_at: new Date().toISOString(),
    },
    confidence: toolUse.input ? 0.8 : 0.3,
  }
}
