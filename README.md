<div align="center">
  <h1 align="center">Papermark</h1>
  <h3>The open-source DocSend alternative.</h3>

<a target="_blank" href="https://www.producthunt.com/posts/papermark-3?utm_source=badge-top-post-badge&amp;utm_medium=badge&amp;utm_souce=badge-papermark"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=411605&amp;theme=light&amp;period=daily" alt="Papermark - The open-source DocSend alternative | Product Hunt" style="width:250px;height:40px"></a>

</div>

<div align="center">
  <a href="https://www.papermark.com">papermark.com</a>
</div>

<br/>

<div align="center">
  <a href="https://github.com/mfts/papermark/stargazers"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/mfts/papermark"></a>
  <a href="https://twitter.com/papermarkio"><img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/papermarkio"></a>
  <a href="https://github.com/mfts/papermark/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-AGPLv3-purple"></a>
</div>

<br/>

Papermark is the open-source document-sharing alternative to DocSend, featuring built-in analytics and custom domains.

## Features

- **Shareable Links:** Share your documents securely by sending a custom link.
- **Custom Branding:** Add a custom domain and your own branding.
- **Analytics:** Gain insights through document tracking and soon page-by-page analytics.
- **Self-hosted, Open-source:** Host it yourself and customize it as needed.

## Demo

![Papermark Welcome GIF](.github/images/papermark-welcome.gif)

## Tech Stack

- [Next.js](https://nextjs.org/) – Framework
- [TypeScript](https://www.typescriptlang.org/) – Language
- [Tailwind](https://tailwindcss.com/) – CSS
- [shadcn/ui](https://ui.shadcn.com) - UI Components
- [Prisma](https://prisma.io) - ORM [![Made with Prisma](https://made-with.prisma.io/dark.svg)](https://prisma.io)
- [PostgreSQL](https://www.postgresql.org/) - Database
- [NextAuth.js](https://next-auth.js.org/) – Authentication
- [Tinybird](https://tinybird.co) – Analytics
- [Resend](https://resend.com) – Email
- [Stripe](https://stripe.com) – Payments
- [Vercel](https://vercel.com/) – Hosting

## Getting Started

### Prerequisites

Here's what you need to run Papermark:

- Node.js (version >= 18.17.0)
- PostgreSQL Database
- Blob storage (currently [AWS S3](https://aws.amazon.com/s3/) or [Vercel Blob](https://vercel.com/storage/blob))
- [Resend](https://resend.com) (for sending emails)

### 1. Clone the repository

```shell
git clone https://github.com/mfts/papermark.git
cd papermark
```

### 2. Install npm dependencies

```shell
npm install
```

### 3. Copy the environment variables to `.env` and change the values

```shell
cp .env.example .env
```

### 4. Initialize the database

```shell
npm run dev:prisma
```

### 5. Run the dev server

```shell
npm run dev
```

### 6. Open the app in your browser

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Self-hosting

Papermark includes production-ready Docker assets so you can run the entire stack (Next.js app, PostgreSQL, and S3-compatible blob storage) without installing Node locally.

**Important:** The application requires certain services to be configured even if you don't plan to use them. At minimum, provide placeholder values for Redis, Slack, and Hanko in your `.env` file to allow the build to complete.

### Docker Compose quick start

1. Reuse the `.env` you created earlier (or copy `.env.example` to `.env` now) and tailor the values for production.
2. **Required**: Add placeholder/dummy values for services you won't use:
   ```dotenv
   # Minimum required for build to succeed
   UPSTASH_REDIS_REST_URL=http://localhost:6379
   UPSTASH_REDIS_REST_TOKEN=dummy-token
   UPSTASH_REDIS_REST_LOCKER_URL=http://localhost:6379
   UPSTASH_REDIS_REST_LOCKER_TOKEN=dummy-token
   SLACK_APP_INSTALL_URL=https://slack.com
   SLACK_CLIENT_ID=dummy-id
   SLACK_CLIENT_SECRET=dummy-secret
   SLACK_INTEGRATION_ID=dummy-integration
   ```
3. Adjust secrets (e.g. `NEXTAUTH_SECRET`, `NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY`) and set the public URLs that end users will visit.
4. For the bundled MinIO/Compose stack, switch storage to S3 mode and align the credentials:
   ```dotenv
   NEXT_PUBLIC_UPLOAD_TRANSPORT="s3"
   NEXT_PRIVATE_UPLOAD_ENDPOINT=http://minio:9000
   NEXT_PRIVATE_UPLOAD_BUCKET=papermark
   NEXT_PRIVATE_UPLOAD_REGION=us-east-1
   NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID=papermark
   NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY=papermarksecret
   NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST=localhost
   ```
   Update the Postgres connection strings if you run an external database instead of the bundled container.
5. Launch the stack:
  ```bash
  docker compose -f docker-compose.yml up -d
  ```

The bundled Compose file exposes Papermark on port `3000`, provisions Postgres `16-alpine`, and uses MinIO for S3-compatible storage. The same configuration is published as the community image [`docker.io/ruthvikupputuri/papermark`](https://hub.docker.com/r/ruthvikupputuri/papermark) – see `DOCKER_HUB_README.md` for a full environment reference.

### Environment checklist

Set the following groups of variables before going live:

- **Core URLs & secrets:** `NEXTAUTH_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXTAUTH_SECRET`, `INTERNAL_API_KEY`.
- **Database:** `POSTGRES_PRISMA_URL` (or `DATABASE_URL`), matching the connection string for your Postgres instance.
- **Storage:** `NEXT_PRIVATE_UPLOAD_*` keys. The Compose setup defaults to MinIO credentials and bucket names defined in `docker-compose.yml`.
- **Required placeholders:** Even if not using these services, provide dummy values: `UPSTASH_REDIS_REST_*`, `SLACK_*` (see Docker quick start for examples).
- **Optional integrations:** Provide real API keys only for services you need (Resend, QStash, Trigger.dev, OAuth providers, Hanko).

## Tinybird Instructions

To prepare the Tinybird database, follow these steps:

0. We use `pipenv` to manage our Python dependencies. If you don't have it installed, you can install it using the following command:
   ```sh
   pkgx pipenv
   ```
1. Download the Tinybird CLI from [here](https://www.tinybird.co/docs/cli.html) and install it on your system.
2. After authenticating with the Tinybird CLI, navigate to the `lib/tinybird` directory:
   ```sh
   cd lib/tinybird
   ```
3. Push the necessary data sources using the following command:
   ```sh
   tb push datasources/*
   tb push endpoints/get_*
   ```
4. Don't forget to set the `TINYBIRD_TOKEN` with the appropriate rights in your `.env` file.

#### Updating Tinybird

```sh
pipenv shell
## start: pkgx-specific
cd ..
cd papermark
## end: pkgx-specific
pipenv update tinybird-cli
```

## Contributing

Papermark is an open-source project, and we welcome contributions from the community.

If you'd like to contribute, please fork the repository and make any changes you'd like. Pull requests are warmly welcome.

Before opening a pull request, run the quality checks locally:

```bash
npm run lint
npm run build
```

Address all eslint warnings and ensure the production build succeeds. If your change affects Prisma schemas or migrations, regenerate artifacts with `npm run dev:prisma` and commit the generated files.

### Our Contributors ✨

<a href="https://github.com/mfts/papermark/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=mfts/papermark" />
</a>
