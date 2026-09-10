// Google Workspace API client implementations (Calendar, Gmail, Docs, Tasks, Contacts)

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

export interface GmailMessagePreview {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

export interface GoogleDocFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GoogleContactPerson {
  resourceName: string;
  etag?: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
}

// -------------------------------------------------------------
// Google Calendar API
// -------------------------------------------------------------

export async function fetchCalendarEvents(token: string): Promise<GoogleCalendarEvent[]> {
  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    now
  )}&maxResults=25&singleEvents=true&orderBy=startTime`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Calendar fetch failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createCalendarEvent(
  token: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
  }
): Promise<GoogleCalendarEvent> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description || '',
      location: event.location || '',
      start: { dateTime: new Date(event.startDateTime).toISOString() },
      end: { dateTime: new Date(event.endDateTime).toISOString() }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Create event failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function deleteCalendarEvent(token: string, eventId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Delete event failed (${res.status}): ${errorText}`);
  }
}

// -------------------------------------------------------------
// Gmail API
// -------------------------------------------------------------

export async function fetchGmailMessages(
  token: string,
  maxResults = 10
): Promise<GmailMessagePreview[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!listRes.ok) {
    const errorText = await listRes.text();
    throw new Error(`Gmail list failed (${listRes.status}): ${errorText}`);
  }

  const listData = await listRes.json();
  const rawList: { id: string; threadId: string }[] = listData.messages || [];

  // Fetch headers & snippet for top messages
  const details = await Promise.all(
    rawList.slice(0, 10).map(async (item) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!detailRes.ok) return { id: item.id, threadId: item.threadId };
        const msgData = await detailRes.json();
        const headers = msgData.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value;
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value;
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value;
        return {
          id: item.id,
          threadId: item.threadId,
          snippet: msgData.snippet,
          subject: subject || '(No Subject)',
          from: from || 'Unknown',
          date: date || ''
        };
      } catch {
        return { id: item.id, threadId: item.threadId };
      }
    })
  );

  return details;
}

export async function sendGmailMessage(
  token: string,
  email: { to: string; subject: string; body: string }
): Promise<{ id: string }> {
  const emailLines = [
    `To: ${email.to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${email.subject}`,
    '',
    email.body
  ];
  const rawContent = emailLines.join('\r\n');
  const encodedRaw = btoa(unescape(encodeURIComponent(rawContent)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedRaw })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function trashGmailMessage(token: string, messageId: string): Promise<void> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}/trash`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail trash failed (${res.status}): ${errorText}`);
  }
}

// -------------------------------------------------------------
// Google Tasks API
// -------------------------------------------------------------

export async function fetchTaskLists(token: string): Promise<GoogleTaskList[]> {
  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Tasks lists fetch failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function fetchTasks(token: string, taskListId: string): Promise<GoogleTaskItem[]> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Tasks fetch failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function createGoogleTask(
  token: string,
  taskListId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTaskItem> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: task.title,
        notes: task.notes || '',
        due: task.due ? new Date(task.due).toISOString() : undefined
      })
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Create task failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function toggleGoogleTaskStatus(
  token: string,
  taskListId: string,
  taskId: string,
  completed: boolean
): Promise<GoogleTaskItem> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: completed ? 'completed' : 'needsAction'
      })
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Toggle task failed (${res.status}): ${errorText}`);
  }

  return res.json();
}

export async function deleteGoogleTask(
  token: string,
  taskListId: string,
  taskId: string
): Promise<void> {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Delete task failed (${res.status}): ${errorText}`);
  }
}

// -------------------------------------------------------------
// Google Docs API & Drive Listing
// -------------------------------------------------------------

export async function fetchRecentDocs(token: string): Promise<GoogleDocFile[]> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.document' and trashed=false");
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=20&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Docs listing failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function createGoogleDoc(
  token: string,
  title: string,
  initialContent?: string
): Promise<{ documentId: string; title: string; url: string }> {
  // Step 1: Create empty document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Create Doc failed (${createRes.status}): ${errorText}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // Step 2: If initialContent, insert text
  if (initialContent && initialContent.trim().length > 0) {
    try {
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                text: initialContent,
                location: { index: 1 }
              }
            }
          ]
        })
      });
    } catch (e) {
      console.warn('Could not insert initial text into document:', e);
    }
  }

  return {
    documentId,
    title: doc.title || title,
    url: `https://docs.google.com/document/d/${documentId}/edit`
  };
}

// -------------------------------------------------------------
// Google Contacts (People API)
// -------------------------------------------------------------

export async function fetchGoogleContacts(token: string): Promise<GoogleContactPerson[]> {
  const url =
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos&pageSize=50&sortOrder=FIRST_NAME_ASCENDING';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Contacts fetch failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const connections = data.connections || [];

  return connections.map((c: any) => {
    const nameObj = c.names?.[0];
    const emailObj = c.emailAddresses?.[0];
    const phoneObj = c.phoneNumbers?.[0];
    const photoObj = c.photos?.[0];

    return {
      resourceName: c.resourceName,
      etag: c.etag,
      displayName: nameObj?.displayName || `${nameObj?.givenName || ''} ${nameObj?.familyName || ''}`.trim() || 'Unnamed Contact',
      email: emailObj?.value || '',
      phoneNumber: phoneObj?.value || '',
      photoUrl: photoObj?.url || ''
    };
  });
}

export async function createGoogleContact(
  token: string,
  contact: {
    givenName: string;
    familyName?: string;
    email?: string;
    phone?: string;
  }
): Promise<GoogleContactPerson> {
  const body: any = {
    names: [{ givenName: contact.givenName, familyName: contact.familyName || '' }]
  };

  if (contact.email) {
    body.emailAddresses = [{ value: contact.email, type: 'work' }];
  }
  if (contact.phone) {
    body.phoneNumbers = [{ value: contact.phone, type: 'mobile' }];
  }

  const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Create contact failed (${res.status}): ${errorText}`);
  }

  const created = await res.json();
  return {
    resourceName: created.resourceName,
    displayName: created.names?.[0]?.displayName || contact.givenName,
    email: created.emailAddresses?.[0]?.value || contact.email || '',
    phoneNumber: created.phoneNumbers?.[0]?.value || contact.phone || ''
  };
}

export async function deleteGoogleContact(token: string, resourceName: string): Promise<void> {
  const res = await fetch(`https://people.googleapis.com/v1/${resourceName}:deleteContact`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Delete contact failed (${res.status}): ${errorText}`);
  }
}
