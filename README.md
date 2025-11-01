# Swarthya Blockchain ML

A TypeScript-based blockchain application for file integrity verification and tamper detection using MongoDB and GridFS storage. Perfect for healthcare and medical record verification.

## Overview

This project implements a blockchain-based system that:
- Stores files securely using MongoDB GridFS
- Creates immutable blockchain records for each file
- Verifies file integrity through hash comparison
- Detects file tampering or modifications
- Maintains blockchain chain integrity

## Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (running locally or remote URI)
- **npm** or **yarn**

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dinexh/Swarthya-blockchain-ML.git
   cd Swarthya-blockchain-ML
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/swasthya
   PORT=3000
   ```

   - **MONGO_URI**: MongoDB connection string (default: `mongodb://localhost:27017/swasthya`)
   - **PORT**: Server port (default: `3000`)

## Running the Project

### Start Development Server
```bash
npm run dev
```
Runs the server with hot-reload using `tsx watch`.

### Build TypeScript
```bash
npm run build
```
Compiles TypeScript files to JavaScript in the `dist` folder.

### Start Production Server
```bash
npm run start
```
Runs the compiled JavaScript server.

## API Endpoints

### Upload File
Upload a file and create a blockchain block for it.

```bash
curl -X POST -F "file=@yourfile.pdf" http://localhost:3000/upload
```

**Response:**
```json
{
  "success": true,
  "file": {
    "id": "67a1b2c3d4e5f6g7h8i9j0k1",
    "filename": "1730520000000-yourfile.pdf",
    "size": 2048,
    "uploadDate": "2025-11-02T10:00:00Z",
    "contentType": "application/pdf"
  },
  "block": {
    "index": 1,
    "timestamp": 1730520000000,
    "data": {
      "fileId": "67a1b2c3d4e5f6g7h8i9j0k1",
      "filename": "1730520000000-yourfile.pdf",
      "fileHash": "abc123def456...",
      "timestamp": 1730520000000
    },
    "prevHash": "0",
    "hash": "xyz789abc123..."
  }
}
```

### List All Files
```bash
curl http://localhost:3000/files
```

### Download File by Filename
```bash
curl http://localhost:3000/file/1730520000000-yourfile.pdf -o yourfile.pdf
```

### Get Complete Blockchain
```bash
curl http://localhost:3000/chain
```

### Verify File by File ID
```bash
curl http://localhost:3000/verify/file/67a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "verified": true,
  "block": {
    "index": 1,
    "timestamp": 1730520000000,
    "data": {
      "fileId": "67a1b2c3d4e5f6g7h8i9j0k1",
      "filename": "1730520000000-yourfile.pdf",
      "fileHash": "abc123def456...",
      "timestamp": 1730520000000
    },
    "prevHash": "0",
    "hash": "xyz789abc123..."
  }
}
```

### Verify File by Filename
```bash
curl http://localhost:3000/verify/name/1730520000000-yourfile.pdf
```

## Verification Script

A unified verification script that checks both blockchain integrity and optionally verifies individual files.

### Verify Blockchain Integrity

Verify the integrity of the entire blockchain, checking all blocks and their links.

```bash
npm run verify
```

**Output:**
```
🔍 Connecting to MongoDB...
✅ Connected to MongoDB

════════════════════════════════════════════════════════════════════════════════
🔗 Verifying Blockchain Integrity
════════════════════════════════════════════════════════════════════════════════

📦 Found 3 block(s)

✅ CHAIN VERIFIED: All blocks are valid and properly linked!

📋 Block Details:
────────────────────────────────────────────────────────────────────────────────
  Block 0: 1730520000000-file1.pdf
  Block 1: 1730519999000-file2.pdf
  Block 2: 1730519998000-file3.pdf
────────────────────────────────────────────────────────────────────────────────

🎉 Blockchain Integrity: CONFIRMED
   - Total blocks: 3
   - All hash links: ✓
   - Chain continuity: ✓

💡 Tip: To verify a specific file, pass the file ID as an argument:
   npm run verify <fileId>

════════════════════════════════════════════════════════════════════════════════
✅ BLOCKCHAIN SYSTEM STATUS: OPERATIONAL
════════════════════════════════════════════════════════════════════════════════
```

### Verify Blockchain + Specific File

Verify both blockchain integrity and a specific file's integrity.

```bash
npm run verify <fileId>
```

**Example:**
```bash
npm run verify 67a1b2c3d4e5f6g7h8i9j0k1
```

**Output:**
```
🔍 Connecting to MongoDB...
✅ Connected to MongoDB

════════════════════════════════════════════════════════════════════════════════
🔗 Verifying Blockchain Integrity
════════════════════════════════════════════════════════════════════════════════

📦 Found 3 block(s)

✅ CHAIN VERIFIED: All blocks are valid and properly linked!

🎉 Blockchain Integrity: CONFIRMED

════════════════════════════════════════════════════════════════════════════════
📄 Verifying File Integrity
════════════════════════════════════════════════════════════════════════════════
📂 File ID: 67a1b2c3d4e5f6g7h8i9j0k1

📊 Verification Results:
────────────────────────────────────────────────────────────────────────────────
Computed Hash : abc123def456...
Block Hash    : abc123def456...
────────────────────────────────────────────────────────────────────────────────

✅ FILE VERIFIED: File hash matches blockchain record!

📦 Block Details:
   - Index: 1
   - Filename: 1730520000000-yourfile.pdf
   - Timestamp: 2025-11-02T10:00:00Z
   - Block Hash: xyz789abc123...
   - Prev Hash: 0

════════════════════════════════════════════════════════════════════════════════
✅ BLOCKCHAIN SYSTEM STATUS: OPERATIONAL
════════════════════════════════════════════════════════════════════════════════
```

**Exit Codes:**
- `0`: Verification successful (blockchain valid, file verified if provided)
- `1`: Verification failed (tampering detected or error occurred)

## How It Works

### Blockchain Architecture

1. **File Upload**: File is stored in MongoDB GridFS
2. **Hash Computation**: SHA-256 hash of file content is calculated
3. **Block Creation**: New block is created containing:
   - File ID
   - Filename
   - File Hash (SHA-256)
   - Timestamp
   - Index (block position in chain)
   - Previous Block Hash (creates linkage)
   - Block Hash (SHA-256 of block content)

4. **Chain Linkage**: Each block's `prevHash` points to the previous block's hash, creating an immutable chain

### Verification Process

**File Verification:**
```
Current File -> SHA-256 Hash -> Compare with Blockchain Record
If Match -> File Verified (Not Tampered)
If Mismatch -> File Corrupted/Modified
```

**Chain Verification:**
```
For Each Block:
  1. Recalculate Block Hash from Block Data
  2. Verify Calculated Hash = Stored Hash
  3. Verify Current Block's prevHash = Previous Block's hash
  
If All Valid -> Chain Integrity Confirmed
If Any Invalid -> Tampering Detected
```

## Database Schema

### Collections

**blocks**
```javascript
{
  _id: ObjectId,
  index: Number,           // Position in chain
  timestamp: Number,       // Block creation time
  data: {
    fileId: String,        // GridFS file ID
    filename: String,      // File name with timestamp
    fileHash: String,      // SHA-256 of file content
    timestamp: Number      // File timestamp
  },
  prevHash: String,        // Hash of previous block (linkage)
  hash: String            // SHA-256 of this block
}
```

**uploads.files** (GridFS metadata)
```javascript
{
  _id: ObjectId,
  filename: String,
  contentType: String,
  uploadDate: Date,
  length: Number,
  metadata: {
    originalName: String,
    mimeType: String,
    uploadedAt: Date,
    size: Number
  }
}
```

## Example Workflow

1. **Upload a file:**
   ```bash
   curl -X POST -F "file=@medical_record.pdf" http://localhost:3000/upload
   ```
   Save the returned `fileId`.

2. **Verify blockchain integrity:**
   ```bash
   npm run verify
   ```
   Output: Blockchain integrity confirmed

3. **Verify blockchain + specific file:**
   ```bash
   npm run verify <fileId>
   ```
   Output: Both blockchain and file verified

4. **If file is tampered (manually modified), verification will fail:**
   ```bash
   npm run verify <fileId>
   ```
   Output: File mismatch detected - file has been modified or corrupted!

## Troubleshooting

### MongoDB Connection Error
```
Database connection failed
```
**Solution:** Ensure MongoDB is running and MONGO_URI is correct.

### GridFS Not Initialized
```
Error: GridFS not initialized yet
```
**Solution:** Wait a moment for the server to connect to MongoDB and initialize GridFS.

### File Not Found
```
No block found for this file ID
```
**Solution:** Ensure the file ID is correct and the file was uploaded through the API.

## Development

### Project Structure
```
src/
  ├── blockchain/       # Blockchain core modules
  │   ├── types.ts      # Type definitions (Block, BlockData)
  │   ├── hash.ts       # Hash calculation functions
  │   └── chain.ts      # Blockchain operations (add, get, verify)
  ├── storage/          # File storage modules
  │   └── gridfs.ts     # GridFS operations (read, upload, hash)
  ├── routes/           # API route handlers
  │   ├── upload.ts     # File upload handler
  │   ├── files.ts      # File listing and download handlers
  │   ├── chain.ts      # Blockchain retrieval handler
  │   └── verify.ts     # File verification handlers
  ├── config/           # Configuration modules
  │   └── database.ts   # Database connection and config
  └── index.ts          # Main server file (Express app setup)
scripts/
  └── verify.ts         # Unified verification script (blockchain + file)
public/
  └── index.html        # Frontend upload interface
```

### Modular Architecture

The codebase is organized into focused modules:

- **Blockchain Module**: Handles all blockchain operations including block creation, hash calculation, and chain verification
- **Storage Module**: Manages GridFS file operations (upload, read, hash computation)
- **Routes Module**: Contains route handlers separated by functionality
- **Config Module**: Centralized database configuration

This modular structure makes the codebase easier to maintain, test, and extend.

### Technologies Used
- **TypeScript**: Type-safe JavaScript
- **Express.js**: Web framework
- **MongoDB**: Database with GridFS for file storage
- **Mongoose**: MongoDB object modeling
- **crypto**: SHA-256 hashing
- **CORS**: Cross-origin resource sharing
- **multer**: File upload middleware

## License

ISC License - See LICENSE file for details

## Contributing

Feel free to submit issues and enhancement requests!

## Support

For issues and questions, please visit:
https://github.com/dinexh/Swarthya-blockchain-ML/issues
