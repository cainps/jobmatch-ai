<?php
declare(strict_types=1);

require __DIR__ . '/db.php';
require_auth();

/** Evita "injeção de fórmula": células que começam com = + - @ seriam executadas pelo Excel. */
function csv_safe(mixed $value): string
{
    $text = (string) $value;
    return preg_match('/^[=+\-@\t\r]/', $text) === 1 ? "'" . $text : $text;
}

try {
    $rows = db()->query(
        'SELECT id, candidate_name, job_title, score, source, summary, created_at
           FROM analyses ORDER BY created_at DESC, id DESC'
    )->fetchAll();
} catch (PDOException $exception) {
    error_log('Exportação JobMatch: ' . $exception->getMessage());
    http_response_code(500);
    exit('Não foi possível exportar os dados.');
}

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="analises-jobmatch-' . date('Y-m-d') . '.csv"');

$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8: o Excel reconhece os acentos
fputcsv($out, ['ID', 'Candidato', 'Vaga', 'Nota', 'Fonte', 'Resumo', 'Data'], ';', '"', '\\');

foreach ($rows as $row) {
    fputcsv($out, [
        $row['id'],
        csv_safe($row['candidate_name'] ?? ''),
        csv_safe($row['job_title']),
        $row['score'],
        $row['source'],
        csv_safe($row['summary']),
        $row['created_at'],
    ], ';', '"', '\\');
}
fclose($out);
