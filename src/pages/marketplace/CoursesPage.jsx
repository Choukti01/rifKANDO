import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCourses } from '../../services/api';
import toast from 'react-hot-toast';
import MediaGallery from '../../components/MediaGallery';
import { getImageUrl } from '../../utils/imageUtils';
import MarketplaceImage from '../../components/common/MarketplaceImage';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import LoadMoreButton from '../../components/common/LoadMoreButton';

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [galleryCourse, setGalleryCourse] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const fetchCourses = useCallback(async ({ page = 1, append = false } = {}) => {
    try {
      if (append) setLoadingMore(true);

      const response = await getCourses({ page, limit: 12 });
      const nextCourses = response.data.courses || [];
      setCourses((currentCourses) => (append ? [...currentCourses, ...nextCourses] : nextCourses));
      setPagination(response.data.pagination || { page: 1, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const loadInitialCourses = async () => {
      try {
        const response = await getCourses({ page: 1, limit: 12 });
        if (!isCurrent) return;

        setCourses(response.data.courses || []);
        setPagination(response.data.pagination || { page: 1, totalPages: 1 });
      } catch (error) {
        if (isCurrent) {
          console.error('Error fetching courses:', error);
          toast.error('Failed to load courses');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadInitialCourses();

    return () => {
      isCurrent = false;
    };
  }, []);

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
          <h1>Courses</h1>
          <p>Learn new skills from expert instructors</p>
        </div>

        <div className="courses-grid">
          {courses.length === 0 ? (
            <p className="text-center col-span-full">No courses found</p>
          ) : (
            courses.map(course => {
              // Get primary image from media array
              const primaryMedia = course.media && course.media.length > 0 
                ? (course.media.find(m => m.is_primary) || course.media[0])
                : null;
              
              return (
                <div key={course.id} className="course-card">
                  {/* Course image – click opens gallery if media exists */}
                  <div 
                    className="course-image" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (course.media && course.media.length > 0) {
                        setGalleryCourse(course);
                      }
                    }}
                    style={{ cursor: course.media && course.media.length > 0 ? 'pointer' : 'default' }}
                    role={course.media?.length ? 'button' : undefined}
                    tabIndex={course.media?.length ? 0 : undefined}
                    aria-label={course.media?.length ? `View media for ${course.title}` : undefined}
                    onKeyDown={(event) => {
                      if (course.media?.length && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        setGalleryCourse(course);
                      }
                    }}
                  >
                    {primaryMedia ? (
                      <>
                        {primaryMedia.media_type === 'video' && <div className="video-badge">🎬 Video</div>}
                        <MarketplaceImage source={primaryMedia.media_url} alt={course.title} />
                        {course.media.length > 1 && (
                          <div className="media-count">{course.media.length} items</div>
                        )}
                      </>
                    ) : (
                      <div className="image-placeholder">📚</div>
                    )}
                  </div>
                  
                  {/* Course title */}
                  <Link to={`/course/${course.id}`}>
                    <h3>{course.title}</h3>
                  </Link>
                  
                  {/* Instructor name */}
                  <p className="instructor-name">
                    by <Link to={`/profile/${course.instructor_id}`} className="instructor-link">
                      {course.instructor_name || 'Unknown Instructor'}
                    </Link>
                    {course.instructor_verified === 1 && <VerifiedBadge size="small" />}
                  </p>
                  
                  <div className="course-meta">
                    <span>⭐ {course.rating || 0}</span>
                    <span>👥 {course.students_count || 0} students</span>
                  </div>
                  
                  <div className="course-price">
                    <span className="current-price">{course.price} MAD</span>
                    {course.old_price && <span className="old-price">{course.old_price} MAD</span>}
                  </div>
                  <Link to={`/course/${course.id}`} className="listing-card-action">Explore course</Link>
                </div>
              );
            })
          )}
        </div>

        <LoadMoreButton
          hasMore={pagination.page < pagination.totalPages}
          isLoading={loadingMore}
          onLoadMore={() => fetchCourses({ page: pagination.page + 1, append: true })}
          itemLabel="courses"
        />
      </div>

      {/* Gallery Modal */}
      {galleryCourse && (
        <MediaGallery
          media={galleryCourse.media.map(m => ({ url: getImageUrl(m.media_url), type: m.media_type }))}
          onClose={() => setGalleryCourse(null)}
        />
      )}

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
        .courses-header p {
          color: #6b7280;
        }
        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .course-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          transition: transform 0.3s;
        }
        .course-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .course-image {
          height: 180px;
          background: #f3f4f6;
          position: relative;
          overflow: hidden;
        }
        .course-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
        }
        .video-badge {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          background: rgba(0,0,0,0.6);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          z-index: 1;
        }
        .media-count {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          background: rgba(0,0,0,0.6);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          z-index: 1;
        }
        .course-card h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0.75rem 1rem 0.25rem;
          color: #1a1a1a;
        }
        .course-card a {
          text-decoration: none;
        }
        .instructor-name {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0 1rem 0.5rem;
        }
        .instructor-link {
          color: #87CEEB;
          text-decoration: none;
        }
        .instructor-link:hover {
          text-decoration: underline;
        }
        .course-meta {
          display: flex;
          gap: 1rem;
          margin: 0 1rem 0.5rem;
          font-size: 0.7rem;
          color: #6b7280;
        }
        .course-price {
          margin: 0 1rem 0.75rem;
          display: flex;
          gap: 0.5rem;
          align-items: baseline;
        }
        .current-price {
          font-weight: 700;
          font-size: 1rem;
        }
        .old-price {
          font-size: 0.75rem;
          color: #9ca3af;
          text-decoration: line-through;
        }
      `}</style>
    </div>
  );
};

export default CoursesPage;
