const { Category, Subject, Author, Publisher } = require('../models');

// Categories
exports.getCategories = async (req, res) => {
  const categories = await Category.findAll({ order: [['name', 'ASC']] });
  res.json({ success: true, categories });
};

exports.createCategory = async (req, res) => {
  const { name, code, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Category name is required.' });
  const category = await Category.create({ name, code, description });
  res.status(201).json({ success: true, category });
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const category = await Category.findByPk(id);
  if (!category) return res.status(404).json({ success: false, message: 'Not found.' });
  await category.update(req.body);
  res.json({ success: true, category });
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  const category = await Category.findByPk(id);
  if (!category) return res.status(404).json({ success: false, message: 'Not found.' });
  await category.destroy();
  res.json({ success: true, message: 'Category deleted.' });
};

// Subjects
exports.getSubjects = async (req, res) => {
  const subjects = await Subject.findAll({ order: [['name', 'ASC']] });
  res.json({ success: true, subjects });
};

exports.createSubject = async (req, res) => {
  const { name, code } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Subject name is required.' });
  const subject = await Subject.create({ name, code });
  res.status(201).json({ success: true, subject });
};

// Authors
exports.getAuthors = async (req, res) => {
  const authors = await Author.findAll({ order: [['name', 'ASC']] });
  res.json({ success: true, authors });
};

exports.createAuthor = async (req, res) => {
  const { name, biography } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Author name is required.' });
  const author = await Author.create({ name, biography });
  res.status(201).json({ success: true, author });
};

// Publishers
exports.getPublishers = async (req, res) => {
  const publishers = await Publisher.findAll({ order: [['name', 'ASC']] });
  res.json({ success: true, publishers });
};

exports.createPublisher = async (req, res) => {
  const { name, address, contact } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Publisher name is required.' });
  const publisher = await Publisher.create({ name, address, contact });
  res.status(201).json({ success: true, publisher });
};
