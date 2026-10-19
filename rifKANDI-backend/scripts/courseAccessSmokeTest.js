const assert = require('node:assert/strict');
const express = require('express');
const createCourseRoutes = require('../src/routes/courseRoutes');

const db = {
  get(sql, params, callback) {
    if (sql.includes('FROM courses c')) return callback(null, { id: 1, instructor_id: 7 });
    if (sql.includes('FROM enrollments')) return callback(null, params[0] === 8 ? { progress: 10 } : null);
    throw new Error('Unexpected query');
  },
  all(sql, params, callback) {
    if (sql.includes('FROM course_lessons')) return callback(null, [
      { id: 1, title: 'Preview', is_preview: true, video_url: 'preview' },
      { id: 2, title: 'Paid', is_preview: false, video_url: 'private', description: 'private' },
    ]);
    if (sql.includes('FROM course_media')) return callback(null, []);
    throw new Error('Unexpected query');
  },
};
const pass = (_req, _res, next) => next();
const identify = (req, _res, next) => { if (req.headers['x-test-user']) req.user = { id: Number(req.headers['x-test-user']) }; next(); };
const app = express();
app.use(createCourseRoutes({ db, protect: identify, optionalProtect: identify, requireSeller: pass,
  validateIdParams: () => pass, validateCourseCreate: pass, validateCourseUpdate: pass,
  validateLessonCreate: pass, validateLessonProgress: pass, validateLessonUpdate: pass }));

(async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const user of [null, 9, 7, 8]) {
      const headers = user ? { 'x-test-user': String(user) } : {};
      const response = await fetch(`${base}/courses/1`, { headers });
      assert.equal(response.status, 200);
      const { course } = await response.json();
      assert.equal(course.lessons[0].video_url, 'preview');
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(course.lessons[1].video_url, user === 7 || user === 8 ? 'private' : undefined);
      assert.equal(course.lessons[1].description, user === 7 || user === 8 ? 'private' : undefined);
      assert.equal(course.isEnrolled, user === 8);
    }
    const enrollment = await fetch(`${base}/courses/1/enroll`, { method: 'POST', headers: { 'x-test-user': '9' } });
    assert.equal(enrollment.status, 503);
    console.log('Course access safeguards passed');
  } finally { await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
