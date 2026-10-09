<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }
$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '', true);
if (!is_array($input) || empty($input['type']) || empty($input['email']) || (empty($input['name']) && (empty($input['firstName']) || empty($input['lastName'])))) { http_response_code(422); echo json_encode(['error' => 'Required fields are missing']); exit; }
if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) { http_response_code(422); echo json_encode(['error' => 'Invalid email']); exit; }
$allowed = ['id','type','createdAt','status','name','firstName','lastName','email','phone','propertyAddress','interest','notes','sourcePage','modelInterest','company','website','serviceArea','partnerType','contactMethod','preferredTime','message'];
$lead = [];
foreach ($allowed as $key) { if (array_key_exists($key, $input)) $lead[$key] = is_string($input[$key]) ? trim(substr($input[$key], 0, 3000)) : $input[$key]; }
if (($lead['type'] ?? '') === 'property' && empty($lead['propertyAddress'])) { http_response_code(422); echo json_encode(['error' => 'Property address is required']); exit; }
$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir) && !mkdir($dataDir, 0750, true) && !is_dir($dataDir)) { http_response_code(500); echo json_encode(['error' => 'Storage unavailable']); exit; }
$file = $dataDir . DIRECTORY_SEPARATOR . 'leads.ndjson';
$line = json_encode($lead, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
if (file_put_contents($file, $line, FILE_APPEND | LOCK_EX) === false) { http_response_code(500); echo json_encode(['error' => 'Could not save']); exit; }
http_response_code(201); echo json_encode(['ok' => true, 'id' => $lead['id'] ?? null]);
