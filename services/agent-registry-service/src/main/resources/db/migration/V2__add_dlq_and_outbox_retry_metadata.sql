ALTER TABLE outbox_events
  ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN last_error TEXT;

CREATE TABLE dlq_events (
  id UUID PRIMARY KEY,
  original_topic VARCHAR(200) NOT NULL,
  dlq_topic VARCHAR(200) NOT NULL,
  consumer_name VARCHAR(160) NOT NULL,
  message_id VARCHAR(255),
  saga_id UUID,
  correlation_id UUID,
  failure_class VARCHAR(180) NOT NULL,
  failure_message TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  replay_eligible BOOLEAN NOT NULL DEFAULT false,
  payload JSONB NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  dead_lettered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replayed_at TIMESTAMPTZ
);

CREATE INDEX ix_dlq_events_original_topic ON dlq_events(original_topic);
CREATE INDEX ix_dlq_events_replay ON dlq_events(replay_eligible, dead_lettered_at);
