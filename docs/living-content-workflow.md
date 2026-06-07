# Living Content Workflow

This document outlines the process for managing and publishing articles within the "Living" (生活・手続き) category of J-Connect Global.

## 1. Purpose
The Living section serves as a practical life-procedure hub for Japanese speakers in Germany. It follows a "media hub" approach similar to platforms like note.com, providing structured, verified, and easy-to-read guides.

## 2. Role of Google Spreadsheet
The [Article Registry Spreadsheet](https://docs.google.com/spreadsheets/d/1mhePFwW-U8FJo5wHZbU5EnWdRpAyDJiG0XsN0MZQ7SQ/edit) acts as the central database for all content. It tracks the status, metadata, and verification history of every article.

## 3. Role of Markdown Files
Markdown files located in `/content/living/` store the actual content and metadata (front matter) of the articles. This allows for version control via GitHub and easy editing by developers or AI agents.

## 4. Folder Structure
- `/content/living/`: Markdown files for articles.
- `/assets/images/living/[slug]/`: Images specific to an article.
- `/germany/ja/living/[slug]/index.html`: The rendered public page.

## 5. Article Creation Steps
1. **Register**: Add a new entry to the Google Spreadsheet to get an ID (e.g., L004).
2. **Draft**: Create a new Markdown file in `/content/living/` using `_template.md`.
3. **Images**: Create a folder in `/assets/images/living/` and add required images.
4. **Develop**: Convert the Markdown content into a static HTML page in the appropriate directory.
5. **Review**: Create a GitHub Pull Request for review.
6. **Publish**: Merge the PR and update the status in the Spreadsheet.

## 6. Image Naming Rules
- `hero.webp`: The main featured image.
- `01-documents.webp`, `02-example.webp`, etc.: Sequential images used within the body.
- Always use `.webp` format and lowercase filenames.

## 7. Metadata Rules (Front Matter)
- `id`: Unique identifier from the spreadsheet.
- `slug`: URL-friendly name (e.g., `anmeldung-guide`).
- `last_verified`: The date the information was last checked against official sources.
- `status`: `draft`, `review`, or `published`.

## 8. Avoiding Outdated Information
- Check the `update_frequency` in the metadata.
- Always include links to official German government sources.
- Add a disclaimer to every article stating that procedures may vary by city or individual situation.

## 9. Future Integration
This workflow is designed to be compatible with AI agents (Manus, Cursor) and automated scripts that can sync the Spreadsheet with the repository.
