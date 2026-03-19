import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = __dirname
const DB_PATH = path.join(DB_DIR, 'organizer.db')
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

const db = new Database(DB_PATH)

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
db.exec(schema)

export default db
