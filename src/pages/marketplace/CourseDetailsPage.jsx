import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { StarIcon, UserGroupIcon, ClockIcon, AcademicCapIcon, CheckBadgeIcon, PlayIcon } from '@heroicons/react/24/outline';
import { getCourse, enrollCourse } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const CourseDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await getCourse(id);
      setCourse(response.data.course);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to enroll');
      navigate('/login');
      return;
    }

    setEnrolling(true);
    try {
      const response = await enrollCourse(id);
      if (response.data.success) {
        toast.success('Successfully enrolled!');
        fetchCourse(); // Refresh course data
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to enroll';
      toast.error(message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading course...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container text-center py-16">
        <p>Course not found</p>
        <Link to="/courses" className="btn btn-primary mt-4">Back to Courses</Link>
      </div>
    );
  }

  const whatYouLearn = course.what_you_learn ? JSON.parse(course.what_you_learn) : [
    'Master the fundamentals',
    'Build real-world projects',
    'Get certified upon completion'
  ];

  return (
    <div className="course-details">
      <div className="container">
        <div className="course-grid">
          <div className="course-main">
            <h1>{course.title}</h1>
            <div className="course-meta">
              <div className="course-rating">
                <StarIcon className="star-icon" />
                <span>{course.rating || 0}</span>
                <span className="review-count">({course.reviews_count || 0} reviews)</span>
              </div>
              <div className="course-students">
                <UserGroupIcon className="meta-icon" />
                <span>{course.students_count || 0} students</span>
              </div>
              <div className="course-duration">
                <ClockIcon className="meta-icon" />
                <span>{course.duration || 0} hours</span>
              </div>
            </div>

            <div className="instructor-info">
              <div className="instructor-avatar">
                {course.instructor_name?.charAt(0) || 'I'}
              </div>
              <div>
                <h3>{course.instructor_name}</h3>
                <p>Course Instructor</p>
              </div>
            </div>

            <div className="what-you-learn">
              <h3>What You'll Learn</h3>
              <div className="learn-list">
                {whatYouLearn.map((item, index) => (
                  <div key={index} className="learn-item">
                    <CheckBadgeIcon className="check-icon" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="curriculum">
              <h3>Course Curriculum</h3>
              {course.lessons && course.lessons.length > 0 ? (
                course.lessons.map((lesson, index) => (
                  <div key={lesson.id} className="curriculum-section">
                    <button
                      onClick={() => setActiveLesson(activeLesson === index ? null : index)}
                      className="section-header"
                    >
                      <span>{lesson.title}</span>
                      <span>{lesson.duration} min</span>
                    </button>
                    {activeLesson === index && (
                      <div className="section-content">
                        <p>{lesson.description || 'No description available'}</p>
                        {lesson.is_preview && lesson.video_url && (
                          <div className="preview-video">
                            <PlayIcon className="play-icon" />
                            <span>Preview available</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Course content coming soon...</p>
              )}
            </div>
          </div>

          <div className="course-sidebar">
            <div className="sidebar-card">
              <div className="course-image-large">
                {course.image || '📚'}
              </div>
              <div className="course-price-section">
                <span className="current-price">{course.price} MAD</span>
                {course.old_price && (
                  <span className="old-price">{course.old_price} MAD</span>
                )}
              </div>
              
              {course.isEnrolled ? (
                <div className="enrolled-badge">
                  <CheckBadgeIcon className="enrolled-icon" />
                  <span>You are enrolled!</span>
                  <Link to={`/my-courses/${course.id}`} className="continue-btn">
                    Continue Learning
                  </Link>
                </div>
              ) : (
                <button 
                  className="enroll-btn" 
                  onClick={handleEnroll}
                  disabled={enrolling}
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </button>
              )}
              
              <div className="course-features">
                <div className="feature-item">
                  <AcademicCapIcon className="feature-icon" />
                  <span>Certificate of completion</span>
                </div>
                <div className="feature-item">
                  <ClockIcon className="feature-icon" />
                  <span>Full lifetime access</span>
                </div>
                <div className="feature-item">
                  <PlayIcon className="feature-icon" />
                  <span>{course.lessons?.length || 0} lessons</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .course-details {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .course-grid {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .course-grid {
            grid-template-columns: 1fr;
          }
        }
        .course-main h1 {
          font-size: 1.75rem;
          margin-bottom: 1rem;
        }
        .course-meta {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .course-rating, .course-students, .course-duration {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.875rem;
          color: #6b7280;
        }
        .star-icon {
          width: 1rem;
          height: 1rem;
          color: #f59e0b;
          fill: #f59e0b;
        }
        .meta-icon {
          width: 1rem;
          height: 1rem;
        }
        .instructor-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 1rem;
          margin-bottom: 2rem;
        }
        .instructor-avatar {
          width: 3rem;
          height: 3rem;
          background: #87CEEB;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1.25rem;
        }
        .what-you-learn {
          background: #f9fafb;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }
        .what-you-learn h3 {
          margin-bottom: 1rem;
        }
        .learn-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        @media (max-width: 640px) {
          .learn-list {
            grid-template-columns: 1fr;
          }
        }
        .learn-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }
        .check-icon {
          width: 1rem;
          height: 1rem;
          color: #10b981;
        }
        .curriculum-section {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          margin-bottom: 0.75rem;
          overflow: hidden;
        }
        .section-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          padding: 1rem;
          background: white;
          border: none;
          cursor: pointer;
          text-align: left;
          font-weight: 500;
        }
        .section-content {
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }
        .preview-video {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          color: #87CEEB;
        }
        .play-icon {
          width: 1rem;
          height: 1rem;
        }
        .sidebar-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: sticky;
          top: 100px;
        }
        .course-image-large {
          height: 150px;
          background: #f3f4f6;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .course-price-section {
          margin-bottom: 1rem;
        }
        .current-price {
          font-size: 1.5rem;
          font-weight: bold;
        }
        .enroll-btn {
          width: 100%;
          padding: 0.75rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        .enroll-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .enrolled-badge {
          text-align: center;
          padding: 0.75rem;
          background: #d1fae5;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
        }
        .enrolled-icon {
          width: 1.25rem;
          height: 1.25rem;
          color: #10b981;
          display: inline;
          margin-right: 0.5rem;
        }
        .continue-btn {
          display: block;
          margin-top: 0.5rem;
          color: #065f46;
          text-decoration: underline;
        }
        .course-features {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }
        .feature-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }
        .feature-icon {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  );
};

export default CourseDetailsPage;