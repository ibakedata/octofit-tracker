import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Props = { title: string; description: string; endpoint: string; dataKey: string };
type RecordData = Record<string, unknown>;

export function CapabilityCard({ title, description, endpoint, dataKey }: Props) {
  const [items, setItems] = useState<RecordData[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<Record<string, unknown>>(endpoint)
      .then((response) => {
        if (active) setItems(Array.isArray(response[dataKey]) ? response[dataKey] as RecordData[] : []);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => { active = false; };
  }, [dataKey, endpoint]);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">{title}</h2>
    <p>{description}</p>
    {items === null && !hasError && <p role="status">Loading {title.toLowerCase()}...</p>}
    {hasError && <p role="alert">Unable to load {title.toLowerCase()}.</p>}
    {items?.length === 0 && <p>No {title.toLowerCase()} available.</p>}
    {items && items.length > 0 && <ul>
      {items.map((item, index) => <li key={index}>
        {Object.entries(item)
          .filter(([key, value]) => !key.startsWith('_') && (typeof value !== 'object' || Array.isArray(value)))
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
          .join(' | ')}
      </li>)}
    </ul>}
  </div></section>;
}
