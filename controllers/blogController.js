// controllers/blogController.js
import BlogPostModel from '../models/BlogPostModel.js';

export async function listPosts(req, res) {
  const posts         = await BlogPostModel.findAll();
  const featuredPosts = await BlogPostModel.findFeatured(5);
  res.render('blog/index', { title: "Blog-Seite", description: "Alles neue zu Technik, Webseiten, Hosting und mehr",posts, featuredPosts });
}

export async function showPost(req, res) {
  const post = await BlogPostModel.findBySlug(req.params.slug);
  const description = await BlogPostModel.findExcerpt(req.params.excerpt);
  if (!post) return res.status(404).send('Artikel nicht gefunden');
  res.render('blog/show', { title: post, description: description, post });
}
