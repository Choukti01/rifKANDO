const express = require('express');
const { createPaginationMetadata, getPagination } = require('../utils/pagination');

// Only explicitly marked previews may reveal their video or lesson content.
const publicLesson = (lesson) => {
  if (lesson.is_preview === true || lesson.is_preview === 1) return lesson;
  return { id: lesson.id, title: lesson.title, duration: lesson.duration, order: lesson.order, is_preview: false };
};

const createCourseRoutes = ({
  db,
  protect,
  optionalProtect,
  requireSeller,
  validateIdParams,
  validateCourseCreate,
  validateCourseUpdate,
  validateLessonCreate,
  validateLessonProgress,
  validateLessonUpdate,
}) => {
  const router = express.Router();

// ==================== COURSE ENDPOINTS ====================
// (unchanged – kept exactly as in original)
router.post('/courses', protect, requireSeller, validateCourseCreate, (req, res) => {
  const { title, description, price, old_price, category, level, duration, what_you_learn, media } = req.body;

  db.run(`
    INSERT INTO courses (
      title, description, price, old_price, category, level,
      duration, what_you_learn, instructor_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `, [
    title, description, price, old_price || null, category, level,
    duration || 0, what_you_learn || '[]', req.user.id
  ], function(err) {
    if (err) {
      console.error('Course creation error:', err);
      res.status(400).json({ error: err.message });
    } else {
      const courseId = this.lastID;
      if (media && media.length) {
        let inserted = 0;
        media.forEach((item, idx) => {
          db.run(
            `INSERT INTO course_media (course_id, media_type, media_url, display_order, is_primary)
             VALUES (?, ?, ?, ?, ?)`,
            [courseId, item.type, item.url, idx, idx === 0 ? 1 : 0],
            (err) => {
              if (err) console.error('Media insert error:', err);
              inserted++;
              if (inserted === media.length) {
                res.json({ success: true, course: { id: courseId, ...req.body } });
              }
            }
          );
        });
      } else {
        res.json({ success: true, course: { id: courseId, ...req.body } });
      }
    }
  });
});

router.get('/courses', (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const whereClause = "c.status = 'published' OR c.status IS NULL";

  db.get(`SELECT COUNT(*) AS total FROM courses c WHERE ${whereClause}`, (countError, countRow) => {
    if (countError) {
      console.error('Courses count error:', countError);
      return res.status(500).json({ error: countError.message });
    }

    const pagination = createPaginationMetadata(page, limit, countRow?.total || 0);
    const sendCourses = (courses) => {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      return res.json({ success: true, courses, pagination });
    };

    db.all(`
      SELECT c.*, u.name as instructor_name, u.id as instructor_id
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
      if (err) {
        console.error('Courses fetch error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (!rows.length) return sendCourses([]);

      let completed = 0;
      rows.forEach((course) => {
        db.all(`SELECT * FROM course_media WHERE course_id = ? ORDER BY display_order, id`, [course.id], (mediaError, media) => {
          if (!mediaError) course.media = media || [];
          completed++;
          if (completed === rows.length) sendCourses(rows);
        });
      });
    });
  });
});

router.get('/courses/:id', optionalProtect, (req, res) => {
  // Responses can contain instructor-only lesson details, so must not be
  // shared by a browser or intermediary cache across accounts.
  res.set('Cache-Control', 'private, no-store');
  db.get(`
    SELECT c.*, u.name as instructor_name, u.id as instructor_id
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    WHERE c.id = ?
  `, [req.params.id], (err, course) => {
    if (err) {
      console.error('Course fetch error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    db.all(`
      SELECT * FROM course_lessons
      WHERE course_id = ?
      ORDER BY "order" ASC, id ASC
    `, [course.id], (err, lessons) => {
      if (err) {
        console.error('Lessons fetch error:', err);
        course.lessons = [];
      } else {
        course.lessons = lessons || [];
      }

      db.all(`SELECT * FROM course_media WHERE course_id = ? ORDER BY display_order, id`, [course.id], (err, media) => {
        if (!err) course.media = media || [];

        if (req.user) {
          db.get(`
            SELECT e.* FROM enrollments e
            JOIN course_bank_transfers p ON p.course_id = e.course_id AND p.buyer_id = e.user_id
            WHERE e.user_id = ? AND e.course_id = ? AND p.payment_status = 'verified'
          `, [req.user.id, course.id], (err, enrollment) => {
            if (err) return res.status(500).json({ error: 'Unable to verify course access' });
            // Legacy enrollments alone do not prove that a course was paid.
            course.isEnrolled = !!enrollment;
            course.progress = enrollment?.progress || 0;
            if (!course.isEnrolled && Number(course.instructor_id) !== Number(req.user.id)) {
              course.lessons = course.lessons.map(publicLesson);
            }
            res.json({ success: true, course });
          });
        } else {
          course.isEnrolled = false;
          course.progress = 0;
          course.lessons = course.lessons.map(publicLesson);
          res.json({ success: true, course });
        }
      });
    });
  });
});

router.get('/my-courses', protect, requireSeller, (req, res) => {
  db.all(`
    SELECT c.*,
      (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as students_count
    FROM courses c
    WHERE c.instructor_id = ?
    ORDER BY c.created_at DESC
  `, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      if (!rows.length) return res.json({ success: true, courses: [] });
      let completed = 0;
      rows.forEach((course) => {
        db.all(`SELECT * FROM course_media WHERE course_id = ? ORDER BY display_order, id`, [course.id], (err, media) => {
          if (!err) course.media = media || [];
          completed++;
          if (completed === rows.length) {
            res.json({ success: true, courses: rows });
          }
        });
      });
    }
  });
});

router.put('/courses/:id', protect, requireSeller, validateIdParams('id'), validateCourseUpdate, (req, res) => {
  const { title, description, price, old_price, category, level, duration, what_you_learn, media } = req.body;
  const courseId = req.params.id;

  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course) return res.status(404).json({ error: 'Course not found' });
    if (course.instructor_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

    db.run(`
      UPDATE courses SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        old_price = COALESCE(?, old_price),
        category = COALESCE(?, category),
        level = COALESCE(?, level),
        duration = COALESCE(?, duration),
        what_you_learn = COALESCE(?, what_you_learn)
      WHERE id = ?
    `, [title, description, price, old_price, category, level, duration, what_you_learn, courseId], function(err) {
      if (err) return res.status(400).json({ error: err.message });

      db.run('DELETE FROM course_media WHERE course_id = ?', [courseId], () => {
        if (media && media.length) {
          media.forEach((item, idx) => {
            db.run(
              `INSERT INTO course_media (course_id, media_type, media_url, display_order, is_primary)
               VALUES (?, ?, ?, ?, ?)`,
              [courseId, item.type, item.url, idx, idx === 0 ? 1 : 0]
            );
          });
        }
        res.json({ success: true, message: 'Course updated' });
      });
    });
  });
});

router.post('/courses/:id/enroll', protect, validateIdParams('id'), (req, res) => {
  // Enrollment will be created by the verified-payment transaction, not by
  // a buyer-controlled request. Keep this closed until that flow is built.
  return res.status(503).json({
    error: 'Course enrollment is not available yet.',
    code: 'COURSE_ENROLLMENT_UNAVAILABLE',
  });
});

router.put('/courses/:courseId/lessons/:lessonId/progress', protect, validateIdParams('courseId', 'lessonId'), validateLessonProgress, (req, res) => {
  const { courseId, lessonId } = req.params;
  const { completed } = req.body;

  db.get(`SELECT l.id FROM course_lessons l
    JOIN enrollments e ON e.course_id = l.course_id AND e.user_id = ?
    JOIN course_bank_transfers p ON p.course_id = e.course_id AND p.buyer_id = e.user_id
    WHERE l.id = ? AND l.course_id = ? AND p.payment_status = 'verified'`,
  [req.user.id, lessonId, courseId], (accessError, lesson) => {
    if (accessError) return res.status(500).json({ error: 'Unable to verify course access' });
    if (!lesson) return res.status(403).json({ error: 'Verified course access is required' });
    db.run(`INSERT INTO lesson_progress (user_id, course_id, lesson_id, completed)
      VALUES (?, ?, ?, ?) ON CONFLICT(user_id, course_id, lesson_id)
      DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP`,
    [req.user.id, courseId, lessonId, Boolean(completed)], (writeError) => {
      if (writeError) return res.status(500).json({ error: 'Unable to save lesson progress' });
      db.get(`SELECT COUNT(*) AS total_lessons FROM course_lessons WHERE course_id = ?`, [courseId], (countError, result) => {
        if (countError) return res.status(500).json({ error: 'Unable to calculate course progress' });
        db.get(`SELECT COUNT(*) AS completed_lessons FROM lesson_progress
          WHERE user_id = ? AND course_id = ? AND completed = TRUE`, [req.user.id, courseId], (progressError, progress) => {
          if (progressError) return res.status(500).json({ error: 'Unable to calculate course progress' });
          const percentComplete = Number(result.total_lessons) > 0
            ? Math.round((Number(progress.completed_lessons) / Number(result.total_lessons)) * 100) : 0;
          db.run('UPDATE enrollments SET progress = ? WHERE user_id = ? AND course_id = ?',
            [percentComplete, req.user.id, courseId], (updateError) => {
              if (updateError) return res.status(500).json({ error: 'Unable to save course progress' });
              return res.json({ success: true, progress: percentComplete });
            });
        });
      });
    });
  });
});

router.post('/courses/:courseId/lessons', protect, requireSeller, validateIdParams('courseId'), validateLessonCreate, (req, res) => {
  const { courseId } = req.params;
  const { title, description, duration, order, is_preview, video_url, delivery_type = 'youtube' } = req.body;

  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run(`
      INSERT INTO course_lessons (course_id, title, description, duration, "order", is_preview, video_url, delivery_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [courseId, title, description, duration, order || 0, Boolean(is_preview), video_url || null, delivery_type], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ success: true, lessonId: this.lastID });
      }
    });
  });
});

router.put('/courses/:courseId/lessons/:lessonId', protect, requireSeller, validateIdParams('courseId', 'lessonId'), validateLessonUpdate, (req, res) => {
  const { courseId, lessonId } = req.params;
  const { title, description, duration, order, is_preview, video_url, delivery_type } = req.body;

  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err || !course || course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run(`
      UPDATE course_lessons SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        duration = COALESCE(?, duration),
        "order" = COALESCE(?, "order"),
        video_url = COALESCE(?, video_url),
        delivery_type = COALESCE(?, delivery_type),
        is_preview = COALESCE(?, is_preview)
      WHERE id = ? AND course_id = ?
    `, [title, description, duration, order, video_url, delivery_type, is_preview, lessonId, courseId], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    });
  });
});

router.delete('/courses/:id', protect, requireSeller, validateIdParams('id'), (req, res) => {
  db.get('SELECT instructor_id FROM courses WHERE id = ?', [req.params.id], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run('DELETE FROM courses WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        db.run('DELETE FROM course_lessons WHERE course_id = ?', [req.params.id]);
        db.run('DELETE FROM enrollments WHERE course_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Course deleted' });
      }
    });
  });
});

router.delete('/courses/:courseId/lessons/:lessonId', protect, requireSeller, validateIdParams('courseId', 'lessonId'), (req, res) => {
  const { courseId, lessonId } = req.params;

  db.get('SELECT instructor_id FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!course || course.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    db.run('DELETE FROM course_lessons WHERE id = ? AND course_id = ?', [lessonId, courseId], function(err) {
      if (err) {
        res.status(400).json({ error: err.message });
      } else {
        res.json({ success: true });
      }
    });
  });
});

  return router;
};

module.exports = createCourseRoutes;
