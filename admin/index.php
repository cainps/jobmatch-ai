<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require_auth();

$error = null;
$stats = ['total' => 0, 'media' => 0, 'melhor' => 0];
$porVaga = [];
$recentes = [];

try {
    $pdo = db();
    $stats = $pdo->query(
        'SELECT COUNT(*) AS total, COALESCE(ROUND(AVG(score), 1), 0) AS media, COALESCE(MAX(score), 0) AS melhor
           FROM analyses'
    )->fetch();
    $porVaga = $pdo->query('SELECT * FROM vw_resumo_por_vaga ORDER BY ultima_analise DESC LIMIT 15')->fetchAll();
    $recentes = $pdo->query(
        'SELECT id, candidate_name, job_title, score, source, created_at
           FROM analyses ORDER BY created_at DESC, id DESC LIMIT 20'
    )->fetchAll();
} catch (PDOException $exception) {
    error_log('Painel JobMatch: ' . $exception->getMessage());
    $error = 'Não foi possível consultar o banco de dados.';
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JobMatch AI - Painel</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f4f6fb; color: #1c2333; margin: 0; }
    main { max-width: 980px; margin: 0 auto; padding: 24px; }
    h1 span { color: #4f46e5; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0 24px; }
    .stat, table { background: #fff; border: 1px solid #e2e7f1; border-radius: 12px; }
    .stat { padding: 16px; }
    .stat b { display: block; font-size: 1.8rem; color: #4f46e5; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; overflow: hidden; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e7f1; font-size: 0.92rem; }
    th { background: #eef0ff; }
    tr:last-child td { border-bottom: 0; }
    .error { color: #dc2626; font-weight: 600; }
    a.btn { display: inline-block; padding: 8px 14px; background: #4f46e5; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
<main>
  <h1>JobMatch<span>AI</span> · Painel</h1>

  <?php if ($error): ?>
    <p class="error"><?= e($error) ?></p>
  <?php else: ?>
    <div class="stats">
      <div class="stat"><b><?= e((string) $stats['total']) ?></b>análises realizadas</div>
      <div class="stat"><b><?= e((string) $stats['media']) ?></b>nota média</div>
      <div class="stat"><b><?= e((string) $stats['melhor']) ?></b>melhor nota</div>
    </div>

    <p><a class="btn" href="export.php">Exportar CSV (abre no Excel)</a></p>

    <h2>Resumo por vaga</h2>
    <table>
      <tr><th>Vaga</th><th>Análises</th><th>Nota média</th><th>Melhor nota</th><th>Última</th></tr>
      <?php foreach ($porVaga as $linha): ?>
        <tr>
          <td><?= e($linha['job_title']) ?></td>
          <td><?= e((string) $linha['total_analises']) ?></td>
          <td><?= e((string) $linha['nota_media']) ?></td>
          <td><?= e((string) $linha['melhor_nota']) ?></td>
          <td><?= e($linha['ultima_analise']) ?></td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$porVaga): ?><tr><td colspan="5">Sem dados ainda.</td></tr><?php endif; ?>
    </table>

    <h2>Análises recentes</h2>
    <table>
      <tr><th>#</th><th>Candidato</th><th>Vaga</th><th>Nota</th><th>Fonte</th><th>Data</th></tr>
      <?php foreach ($recentes as $linha): ?>
        <tr>
          <td><?= e((string) $linha['id']) ?></td>
          <td><?= e($linha['candidate_name'] ?? '-') ?></td>
          <td><?= e($linha['job_title']) ?></td>
          <td><?= e((string) $linha['score']) ?></td>
          <td><?= e($linha['source']) ?></td>
          <td><?= e($linha['created_at']) ?></td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$recentes): ?><tr><td colspan="6">Sem dados ainda.</td></tr><?php endif; ?>
    </table>
  <?php endif; ?>
</main>
</body>
</html>
