// Shared utilities for live-examples module
import { Buffer } from 'node:buffer'

// Base64 encode to prevent preprocessors from modifying the content
export const to_base64 = (src: string): string =>
  Buffer.from(src, `utf-8`).toString(`base64`)

// Decode base64 encoded source
export const from_base64 = (src: string): string =>
  Buffer.from(src, `base64`).toString(`utf-8`)
