const slugify = (text, separator = '-') => {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
};

module.exports = slugify;