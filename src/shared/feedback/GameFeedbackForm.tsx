import { useEffect, useRef, useState } from 'react';

import {
  FEEDBACK_COMMENT_MAX_LENGTH,
  FeedbackConfigurationError,
  submitGameFeedback,
  type GameFeedbackSubmission,
} from './feedbackClient.ts';
import styles from './GameFeedbackForm.module.css';

type FeedbackSubmitter = (submission: GameFeedbackSubmission) => Promise<void>;

/**
 * What happened to an attempt, for the host's analytics.
 *
 * Carries the rating and an outcome word — never the comment. The form has no
 * way to report the text the couple wrote, and that is deliberate: see the
 * allow-list in `shared/analytics/analyticsBridge.ts`.
 */
export interface FeedbackResult {
  rating: number;
  result: 'sent' | 'failed' | 'unavailable';
}

export interface GameFeedbackFormProps {
  gameId: string;
  onSkip: () => void;
  onContinue: () => void;
  submitFeedback?: FeedbackSubmitter;
  /** Optional. Called once per completed attempt, success or failure. */
  onResult?: (result: FeedbackResult) => void;
}

/** Reusable rating form; game identity and persistence are injected contracts. */
export function GameFeedbackForm({
  gameId,
  onSkip,
  onContinue,
  submitFeedback = submitGameFeedback,
  onResult,
}: GameFeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState('');
  const submissionLock = useRef(false);
  const formHeadingRef = useRef<HTMLHeadingElement>(null);
  const firstRatingRef = useRef<HTMLInputElement>(null);
  const thanksHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    formHeadingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (submitted) thanksHeadingRef.current?.focus();
  }, [submitted]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionLock.current) return;

    if (rating === 0) {
      setStatus('בחרו דירוג של כוכב אחד עד חמישה.');
      firstRatingRef.current?.focus();
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);
    setStatus('');

    try {
      await submitFeedback({ gameId, rating, comment });
      setSubmitted(true);
      onResult?.({ rating, result: 'sent' });
    } catch (error) {
      const unconfigured = error instanceof FeedbackConfigurationError;
      // The lock is released so the couple can try again; the attempt is
      // reported either way, because a failure rate is the only way anyone finds
      // out the feedback table stopped accepting rows.
      submissionLock.current = false;
      setSubmitting(false);
      setStatus(
        unconfigured
          ? 'מערכת המשוב עדיין לא מחוברת. אפשר לדלג ולהמשיך.'
          : 'לא הצלחנו לשלוח את המשוב. נסו שוב או דלגו והמשיכו.',
      );
      onResult?.({ rating, result: unconfigured ? 'unavailable' : 'failed' });
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="game-feedback-title">
      {submitted ? (
        <div className={styles.thanks}>
          <span className={styles.sparkle} aria-hidden="true">
            ✨
          </span>
          <h2 ref={thanksHeadingRef} tabIndex={-1} id="game-feedback-title" className={styles.title}>
            תודה ששיתפתם
          </h2>
          <p className={styles.copy}>המשוב שלכם נשלח ויעזור לנו לשפר את המסעות הבאים.</p>
          <button type="button" className={styles.primaryButton} onClick={onContinue}>
            המשך
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit} aria-busy={submitting} noValidate>
          <div className={styles.headingGroup}>
            <p className={styles.eyebrow}>רגע לפני שנפרדים</p>
            <h2 ref={formHeadingRef} tabIndex={-1} id="game-feedback-title" className={styles.title}>
              איך היה המסע שלכם?
            </h2>
          </div>

          <fieldset className={styles.ratingField} aria-describedby="game-feedback-status">
            <legend className={styles.legend}>בחרו דירוג</legend>
            <div className={styles.stars} dir="ltr">
              {[1, 2, 3, 4, 5].map((value) => (
                <span className={styles.starChoice} key={value}>
                  <input
                    ref={value === 1 ? firstRatingRef : undefined}
                    className={styles.radio}
                    type="radio"
                    name="game-feedback-rating"
                    value={value}
                    checked={rating === value}
                    aria-label={`${value} ${value === 1 ? 'כוכב' : 'כוכבים'}`}
                    aria-invalid={status.startsWith('בחרו דירוג') ? true : undefined}
                    onChange={() => {
                      setRating(value);
                      setStatus('');
                    }}
                  />
                  <span className={styles.star} aria-hidden="true">
                    {value <= rating ? '★' : '☆'}
                  </span>
                </span>
              ))}
            </div>
          </fieldset>

          <label className={styles.commentLabel} htmlFor="game-feedback-comment">
            הערה (לא חובה)
          </label>
          <textarea
            id="game-feedback-comment"
            className={styles.comment}
            value={comment}
            maxLength={FEEDBACK_COMMENT_MAX_LENGTH}
            rows={3}
            placeholder="מה אהבתם, ומה נוכל לשפר?"
            onChange={(event) => setComment(event.target.value)}
          />
          <p className={styles.count} aria-hidden="true">
            {comment.length}/{FEEDBACK_COMMENT_MAX_LENGTH}
          </p>

          <p id="game-feedback-status" className={styles.status} role="status">
            {status}
          </p>

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryButton} disabled={submitting}>
              {submitting ? 'שולחים…' : 'שליחת משוב'}
            </button>
            <button type="button" className={styles.skipButton} onClick={onSkip} disabled={submitting}>
              דלגו והמשיכו
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
