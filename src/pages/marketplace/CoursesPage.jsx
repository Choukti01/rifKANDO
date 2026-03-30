import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { StarIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline'

const CoursesPage = () => {
  const [selectedLevel, setSelectedLevel] = useState('all')

  const levels = [
    { id: 'all', name: 'All Levels' },
    { id: 'beginner', name: 'Beginner' },
    { id: 'intermediate', name: 'Intermediate' },
    { id: 'advanced', name: 'Advanced' },
  ]

  const courses = [
    { id: 1, title: 'Complete React.js Course', instructor: 'Ahmed Alawi', price: 499, students: 1234, rating: 4.9, duration: '15 hours', level: 'beginner', image: '⚛️' },
    { id: 2, title: 'Web Development Bootcamp', instructor: 'Sara Benali', price: 899, students: 2345, rating: 4.8, duration: '40 hours', level: 'beginner', image: '🌐' },
    { id: 3, title: 'UI/UX Design Masterclass', instructor: 'Fatima Zahra', price: 399, students: 567, rating: 4.7, duration: '12 hours', level: 'intermediate', image: '🎨' },
  ]

  const filtered = selectedLevel === 'all' ? courses : courses.filter(c => c.level === selectedLevel)

  return (
    <div className="courses-page">
      <div className="container">
        <div className="courses-header">
          <h1>Online Courses</h1>
          <p>Learn new skills from expert instructors</p>
        </div>

        <div className="courses-levels">
          {levels.map(level => (
            <button
              key={level.id}
              onClick={() => setSelectedLevel(level.id)}
              className={`level-btn ${selectedLevel === level.id ? 'active' : ''}`}
            >
              {level.name}
            </button>
          ))}
        </div>

        <div className="courses-grid">
          {filtered.map(course => (
            <Link key={course.id} to={`/course/${course.id}`} className="course-card">
              <div className="course-image">{course.image}</div>
              <div className="course-content">
                <h3>{course.title}</h3>
                <p>by {course.instructor}</p>
                <div className="course-stats">
                  <div className="course-rating">
                    <StarIcon className="star-icon" />
                    <span>{course.rating}</span>
                  </div>
                  <div className="course-students">
                    <UserGroupIcon className="user-icon" />
                    <span>{course.students.toLocaleString()}</span>
                  </div>
                  <div className="course-duration">
                    <ClockIcon className="clock-icon" />
                    <span>{course.duration}</span>
                  </div>
                </div>
                <div className="course-footer">
                  <span className="course-price">{course.price} MAD</span>
                  <button className="course-btn">Enroll Now</button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .courses-page {
          padding: 2rem 0;
          min-height: calc(100vh - 80px);
        }
        .courses-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .courses-header h1 {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }
        .courses-levels {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        .level-btn {
          padding: 0.5rem 1.5rem;
          border-radius: 2rem;
          border: 1px solid #e5e7eb;
          background: white;
          cursor: pointer;
        }
        .level-btn.active {
          background: #87CEEB;
          border-color: #87CEEB;
          color: #1a1a1a;
        }
        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .course-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-decoration: none;
          transition: all 0.3s;
        }
        .course-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .course-image {
          height: 160px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
        }
        .course-content {
          padding: 1rem;
        }
        .course-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #1a1a1a;
        }
        .course-content p {
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }
        .course-stats {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          font-size: 0.7rem;
          color: #6b7280;
        }
        .course-rating, .course-students, .course-duration {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .star-icon, .user-icon, .clock-icon {
          width: 0.75rem;
          height: 0.75rem;
        }
        .star-icon {
          color: #f59e0b;
          fill: #f59e0b;
        }
        .course-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .course-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .course-btn {
          padding: 0.375rem 1rem;
          background: #1a1a1a;
          color: white;
          border: none;
          border-radius: 2rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}

export default CoursesPage