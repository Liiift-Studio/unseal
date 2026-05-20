// Sitemap for unseal.dev
import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: "https://unseal.dev",
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 1,
		},
	]
}
