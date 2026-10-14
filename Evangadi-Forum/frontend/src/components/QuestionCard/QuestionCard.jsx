import { MessageSquare, ArrowUpRight, Bookmark, BookmarkCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { questionService } from '../../services/question/question.service.js';
import styles from './QuestionCard.module.css';

function initials(author) {
  const first = author?.firstName?.[0] || '';
  const last = author?.lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || 'U';
}

export default function QuestionCard({ question, compact = false, onUnsave }) {
  const navigate = useNavigate();
  const author = question.author || {};
  const answerCount = Number(question.answerCount || 0);
  const [isSaved, setIsSaved] = useState(Boolean(question.isSaved));
  const [saveError, setSaveError] = useState('');

  const openQuestion = () => {
    if (question.questionHash) {
      navigate(`/questions/${question.questionHash}`);
    }
  };

  const toggleSaved = async event => {
    event.stopPropagation();
    try { const saved = !isSaved; await questionService.saveQuestion(question.questionHash, saved); setIsSaved(saved); setSaveError(''); if (!saved) onUnsave?.(question.questionHash); }
    catch (error) { setSaveError(error.message); }
  };

  return (
    <article
      className={`${styles.card} ${compact ? styles['card--compact'] : ''}`}
      onClick={openQuestion}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openQuestion();
        }
      }}
      role="link"
      tabIndex={0}
    >
      <div className={styles.avatar} aria-hidden>
        {author.avatar ? <img src={author.avatar} alt="" /> : initials(author)}
      </div>

      <div className={styles.body}>
        <div className={styles.headingRow}>
          <h3 className={styles.title}>{question.title}</h3>
          <button type="button" className={styles.saveButton} onClick={toggleSaved} aria-label={isSaved ? 'Remove saved question' : 'Save question'} title={saveError || (isSaved ? 'Remove saved question' : 'Save question')}><span className={styles.saveError}>{saveError}</span>{isSaved ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>}</button>
          <ArrowUpRight className={styles.openIcon} size={16} aria-hidden />
        </div>

        {question.content ? (
          <div className={styles.excerpt}>
            <ReactMarkdown
              components={{
                h1: 'h4',
                h2: 'h4',
                h3: 'h4',
                a: ({ children }) => <span>{children}</span>,
              }}
            >
              {question.content}
            </ReactMarkdown>
          </div>
        ) : null}

        <div className={styles.meta}>
          <span>
            <MessageSquare size={13} aria-hidden />
            {answerCount} {answerCount === 1 ? 'reply' : 'replies'}
          </span>
          <span>by {author.firstName || 'unknown'} {author.lastName || ''}</span>
          {question.createdAt ? <span>{formatRelativeDate(question.createdAt)}</span> : null}
        </div>
      </div>
    </article>
  );
}

export function formatRelativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}
