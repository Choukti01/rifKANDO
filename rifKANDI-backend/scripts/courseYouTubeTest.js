const assert = require('node:assert/strict');
const { parseYouTubeVideo } = require('../src/utils/courseYouTube');

for (const url of [
  'https://youtu.be/dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com/embed/dQw4w9WgXcQ',
  'https://m.youtube.com/shorts/dQw4w9WgXcQ',
]) {
  assert.equal(parseYouTubeVideo(url)?.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
}
for (const url of [
  '', null, 'javascript:alert(1)', 'http://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
  'https://user@youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com:444/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/invalid', 'https://youtu.be/dQw4w9WgXcQ/extra',
]) assert.equal(parseYouTubeVideo(url), null);
console.log('Course YouTube link validation tests passed');
