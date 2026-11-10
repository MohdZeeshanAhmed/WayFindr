import { z } from 'zod'

const sourceSchema = z.object({
  label: z.string(),
  url: z.string().url().refine((value) => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS source URL.'),
  topic: z.string(),
})

export const destinationSchema = z.object({
  slug: z.string(), name: z.string(), short: z.string(), city: z.string(),
  image: z.string(), alt: z.string(), color: z.string(),
  subjects: z.array(z.string()), levels: z.array(z.string()),
  overview: z.string(), studentLife: z.string(),
  requirements: z.array(z.string()), stages: z.array(z.string()),
  intakes: z.string(), scholarship: z.string(), tuition: z.string(),
  living: z.string(), updated: z.string(), sources: z.array(sourceSchema),
})

export const resourceSchema = z.object({
  title: z.string(), slug: z.string(), category: z.string().default('Guides'),
  excerpt: z.string().default(''), body: z.string(),
  sample: z.boolean().default(false), updated: z.string().default(''),
  sources: z.array(sourceSchema).default([]),
})
