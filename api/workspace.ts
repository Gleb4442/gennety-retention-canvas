// In-memory cache for serverless lifecycle (or cloud sync)
let memoryStore: Record<string, { projects: any[]; activeProjectId: string; updatedAt: number }> = {};

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method, query, body } = req;

  // GET /api/workspace?key=...
  if (method === 'GET') {
    const key = (query.key as string) || (query.accessKey as string);
    if (!key) {
      return res.status(400).json({ success: false, error: 'Параметр "key" обязателен.' });
    }

    const cleanKey = key.trim();
    const stored = memoryStore[cleanKey];

    if (stored) {
      return res.status(200).json({
        success: true,
        accessKey: cleanKey,
        projects: stored.projects,
        activeProjectId: stored.activeProjectId,
        updatedAt: stored.updatedAt,
      });
    }

    // If not found in memory, return empty signal so client uses starter or local data
    return res.status(200).json({
      success: false,
      notFound: true,
      message: 'Workspace not found in cloud cache. Using local snapshot.',
    });
  }

  // POST /api/workspace
  if (method === 'POST') {
    try {
      const data = typeof body === 'string' ? JSON.parse(body) : body;
      const { accessKey, projects, activeProjectId } = data || {};

      if (!accessKey || !Array.isArray(projects)) {
        return res.status(400).json({
          success: false,
          error: 'Неверные данные: требуются "accessKey" и массив "projects".',
        });
      }

      const cleanKey = accessKey.trim();
      memoryStore[cleanKey] = {
        projects,
        activeProjectId: activeProjectId || projects[0]?.id || '',
        updatedAt: Date.now(),
      };

      return res.status(200).json({
        success: true,
        accessKey: cleanKey,
        totalProjects: projects.length,
        savedAt: Date.now(),
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Ошибка обработки данных воркспейса.',
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
