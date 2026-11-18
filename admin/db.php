<?php
declare(strict_types=1);

/** Conexão PDO com o MySQL, configurada por variáveis de ambiente. */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            getenv('DB_HOST') ?: 'localhost',
            getenv('DB_PORT') ?: '3306',
            getenv('DB_NAME') ?: 'jobmatch'
        );
        $pdo = new PDO($dsn, getenv('DB_USER') ?: 'jobmatch', getenv('DB_PASSWORD') ?: '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

/** Autenticação HTTP Basic simples para o painel (usuário/senha vêm do ambiente). */
function require_auth(): void
{
    $user = getenv('ADMIN_USER') ?: 'admin';
    $pass = getenv('ADMIN_PASSWORD') ?: '';

    if ($pass === '') {
        http_response_code(500);
        exit('Defina ADMIN_PASSWORD no ambiente para usar o painel.');
    }

    $givenUser = $_SERVER['PHP_AUTH_USER'] ?? '';
    $givenPass = $_SERVER['PHP_AUTH_PW'] ?? '';

    if (!hash_equals($user, $givenUser) || !hash_equals($pass, $givenPass)) {
        header('WWW-Authenticate: Basic realm="JobMatch Admin"');
        http_response_code(401);
        exit('Autenticação necessária.');
    }
}

/** Escapa texto para HTML. */
function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
