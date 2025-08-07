// controllers/blogController.js
import BlogPostModel from '../models/BlogPostModel.js';

export async function listPosts(req, res) {
  const posts         = await BlogPostModel.findAll();
  const featuredPosts = await BlogPostModel.findFeatured(5);
  res.render('blog/index', { title: "Aktuelles und News aus dem Technikbereich sowie Rabattaktionen", description: "Neue Informationen zu KI, Websiten, Wissenswertes sowie Angebote und Rabattaktionen.",posts, featuredPosts });
}

export async function showPost(req, res) {
  const post = await BlogPostModel.findBySlug(req.params.slug);
  const excerpt = await BlogPostModel.findExcerpt(req.params.excerpt);
  if (!post) return res.status(404).send('Artikel nicht gefunden');
  res.render('blog/show', { title: post.title, description: post.description, post, excerpt: excerpt });
}
