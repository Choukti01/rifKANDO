import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { StarIcon, UserGroupIcon, ClockIcon, AcademicCapIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'

const CourseDetailsPage = () => {
  const { id } = useParams()
  const [activeLesson, setActiveLesson] = useState(null)

  const course = {
    id: 1,
    title: 'Complete React.js Course',
    instructor: 'Ahmed Alawi',
    price: 499,
    oldPrice: 999,
    rating: 4.9,
    students: 12340,
    duration: '15 hours',
    lessons: 45,
    level: 'Beginner',
    image: '⚛️',
    whatYoullLearn: [
      'Build complete React applications',
      'Master React Hooks',
      'Understand React Router',
      'Connect with APIs',
      'Deploy React applications'
    ],
    curriculum: [
      { title: 'Introduction to React', duration: '30 min', lessons: 4 },
      { title: 'React Components & Props', duration: '45 min', lessons: 5 },
      { title: 'State & Hooks', duration: '1 hour', lessons: 6 },
    ]
  }

  return (
    <div className="course-details">
      <div className="container">
        <div className="course-grid">
          <div className="course-main">
            <h1>{course.title}</h1>
            <div className="course-meta">
              <div className="course-rating">
                <StarIcon className="star-icon" />
                <span>{course.rating}</span>
              </div>
              <div className="course-students">
                <UserGroupIcon className="meta-icon" />
                <span>{course.students.toLocaleString()} students</span>
              </div>
              <div className="course-duration">
                <ClockIcon className="meta-icon" />
                <span>{course.duration}</span>
              </div>
            </div>

            <div className="instructor-info">
              <div className="instructor-avatar">A</div>
              <div>
                <h3>{course.instructor}</h3>
                <p>Senior Full Stack Developer</p>
              </div>
            </div>

            <div className="what-you-learn">
              <h3>What You'll Learn</h3>
              <div className="learn-list">
                {course.whatYoullLearn.map((item, index) => (
                  <div key={index} className="learn-item">
                    <CheckBadgeIcon className="check-icon" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="curriculum">
              <h3>Course Curriculum</h3>
              {course.curriculum.map((section, index) => (
                <div key={index} className="curriculum-section">
                  <button onClick={() => setActiveLesson(activeLesson === index ? null : index)} className="section-header">
                    <span>{section.title}</span>
                    <span>{section.duration} • {section.lessons} lessons</span>
                  </button>
                  {activeLesson === index && (
                    <div className="section-lessons">
                      {[...Array(section.lessons)].map((_, i) => (
                        <div key={i} className="lesson-item">
                          <span>Lesson {i + 1}: Introduction</span>
                          <span>5 min</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="course-sidebar">
            <div className="sidebar-card">
              <div className="course-image">{course.image}</div>
              <div className="course-price">
                <span className="current-price">{course.price} MAD</span>
                {course.oldPrice && <span className="old-price">{course.oldPrice} MAD</span>}
              </div>
              <button className="enroll-btn">Enroll Now</button>
              <div className="course-features">
                <div className="feature-item">
                  <AcademicCapIcon className="feature-icon" />
                  <span>Certificate of completion</span>
                </div>
                <div className="feature-item">
                  <ClockIcon className="feature-icon" />
                  <span>Full lifetime access</span>
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
        }
        .section-lessons {
          border-top: 1px solid #e5e7eb;
        }
        .lesson-item {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
        }
        .sidebar-card {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          position: sticky;
          top: 100px;
        }
        .course-image {
          height: 150px;
          background: #f3f4f6;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .course-price {
          margin-bottom: 1rem;
        }
        .enroll-btn {
          width: 100%;
          padding: 0.75rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          cursor: pointer;
          margin-bottom: 1rem;
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
  )
}

export default CourseDetailsPage