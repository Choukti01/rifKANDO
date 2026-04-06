import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import { getCourses } from '../../services/api';
import toast from 'react-hot-toast';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('all');

  const levels = [
    { id: 'all', name: 'All Levels' },
    { id: 'beginner', name: 'Beginner' },
    { id: 'intermediate', name: 'Intermediate' },
    { id: 'advanced', name: 'Advanced' },
  ];

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await getCourses();
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = selectedLevel === 'all' 
    ? courses 
    : courses.filter(c => c.level === selectedLevel);

  if (loading) {
    return (
      <div className="container text-center py-16">
        <div className="spinner"></div>
        <p>Loading courses...</p>
      </div>
    );
  }

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
          {filteredCourses.length === 0 ? (
            <p className="text-center col-span-full">No courses found</p>
          ) : (
            filteredCourses.map(course => (
              <Link key={course.id} to={`/course/${course.id}`} className="course-card">
                <div className="course-image">
                  {course.image || '📚'}
                </div>
                <div className="course-content">
                  <h3>{course.title}</h3>
                  <p>by {course.instructor_name}</p>
                  <div className="course-stats">
                    <div className="course-rating">
                      <StarIcon className="star-icon" />
                      <span>{course.rating || 0}</span>
                    </div>
                    <div className="course-students">
                      <UserGroupIcon className="user-icon" />
                      <span>{course.students_count || 0}</span>
                    </div>
                    <div className="course-duration">
                      <ClockIcon className="clock-icon" />
                      <span>{course.duration || 0} hours</span>
                    </div>
                  </div>
                  <div className="course-footer">
                    <span className="course-price">{course.price} MAD</span>
                    {course.old_price && (
                      <span className="old-price">{course.old_price} MAD</span>
                    )}
                    <button className="course-btn">View Course</button>
                  </div>
                </div>
              </Link>
            ))
          )}
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
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .course-price {
          font-weight: 700;
          color: #1a1a1a;
        }
        .old-price {
          font-size: 0.75rem;
          color: #9ca3af;
          text-decoration: line-through;
        }
        .course-btn {
          margin-left: auto;
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
  );
};

export default CoursesPage;