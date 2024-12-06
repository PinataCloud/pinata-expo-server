import { Hono } from "hono";
import { cors } from "hono/cors";
import { pinata } from "./pinata";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

const app = new Hono();
app.use("/*", cors());
app.use("*", clerkMiddleware());

app.get("/", (c) => {
	return c.text("Welcome!");
});

app.post("/files", async (c) => {
	const body = await c.req.parseBody();
	const file = body.file as File;
	const name = body.name as string;

	const auth = getAuth(c);

	if (!auth?.userId) {
		return c.json(
			{
				message: "You are not logged in.",
			},
			401,
		);
	}

	if (!file || !name) {
		return c.json({ error: "Invalid upload" }, 400);
	}
	try {
		const upload = await pinata.upload.file(file).addMetadata({
			name: name,
			keyvalues: {
				user: auth.userId,
			},
		});
		return c.json({ data: upload }, 200);
	} catch (error) {
		console.error("Error uploading file:", error);
		return c.json({ error: "Failed to upload file" }, 500);
	}
});

app.get("/files", async (c) => {
	const auth = getAuth(c);

	if (!auth?.userId) {
		return c.json(
			{
				message: "You are not logged in.",
			},
			401,
		);
	}
	try {
		const files = await pinata.files
			.list()
			.metadata({
				user: auth.userId,
			})
			.limit(10);
		const urls: any = [];

		for (const file of files.files) {
			const url = await pinata.gateways
				.createSignedURL({
					cid: file.cid,
					expires: 3000,
				})
				.optimizeImage({
					width: 700,
				});
			urls.push({ url: url });
		}
		return c.json(urls, 200);
	} catch (error) {
		console.error("Error fetching files:", error);
		return c.json({ error: "Failed to fetch files" }, 500);
	}
});

export default app;
