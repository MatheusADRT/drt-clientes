<?php
/**
 * DRT Creation · Mensalidade (WordPress / WooCommerce)
 * Colar no plugin "Code Snippets" → "Run snippet everywhere". Trocar DRT_BILLING_URL pela chave do cliente.
 *
 *  - Consulta a central a cada 5 minutos (cache), com 4 s de limite.
 *  - "suspended": visitantes veem uma página 503 neutra. Administradores logados continuam vendo o site
 *    (com uma faixa vermelha), e o painel, o login, a API e os pagamentos do WooCommerce seguem funcionando.
 *  - "warning": só administradores veem uma faixa de aviso (os clientes da loja não veem nada).
 *  - Se a central não responder, vale o último status; se nunca respondeu, o site fica NO AR.
 */
if ( ! defined( 'ABSPATH' ) ) { return; }
if ( ! defined( 'DRT_BILLING_URL' ) ) {
	define( 'DRT_BILLING_URL', 'https://CENTRAL/api/status/CHAVE-DO-CLIENTE' );
}

function drt_billing_status() {
	// administrador pode forçar uma nova consulta: /?drt_billing=refresh
	if ( isset( $_GET['drt_billing'] ) && 'refresh' === $_GET['drt_billing'] && current_user_can( 'manage_options' ) ) { delete_transient( 'drt_billing_status' ); }
	$cached = get_transient( 'drt_billing_status' );
	if ( is_array( $cached ) ) { return $cached; }
	$last = get_option( 'drt_billing_last', array( 'status' => 'active' ) );
	$r    = wp_remote_get( DRT_BILLING_URL, array( 'timeout' => 4, 'user-agent' => 'drt-billing-wp' ) );
	if ( ! is_wp_error( $r ) && 200 === (int) wp_remote_retrieve_response_code( $r ) ) {
		$j = json_decode( wp_remote_retrieve_body( $r ), true );
		if ( is_array( $j ) && isset( $j['status'] ) && in_array( $j['status'], array( 'active', 'warning', 'suspended' ), true ) ) {
			$last = array( 'status' => $j['status'], 'due' => isset( $j['due'] ) ? $j['due'] : '', 'suspendOn' => isset( $j['suspendOn'] ) ? $j['suspendOn'] : '' );
			update_option( 'drt_billing_last', $last, false );
		}
	}
	set_transient( 'drt_billing_status', $last, 5 * MINUTE_IN_SECONDS );
	return $last;
}

// visitantes: página de indisponibilidade quando suspenso
add_action( 'template_redirect', function () {
	$s = drt_billing_status();
	if ( 'suspended' !== $s['status'] || current_user_can( 'manage_options' ) ) { return; }
	status_header( 503 );
	header( 'Retry-After: 3600' );
	nocache_headers();
	$name = esc_html( get_bloginfo( 'name' ) );
	echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' . $name . '</title>'
		. '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fdf8f6;color:#1c1216;font:16px/1.6 system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:26px;margin:0 0 10px}p{margin:4px 0;color:#6b5a5f}</style></head>'
		. '<body><main><h1>' . $name . '</h1><p>Le site est temporairement indisponible.</p><p>The website is temporarily unavailable.</p><p>O site está temporariamente indisponível.</p></main></body></html>';
	exit;
}, 0 );

// administradores: aviso no painel e no site
function drt_billing_notice_text( $s ) {
	if ( 'suspended' === $s['status'] ) { return 'Site suspendu pour mensualité impayée : les visiteurs ne voient plus le site. Contactez DRT Creation.'; }
	if ( 'warning' === $s['status'] ) { return 'Mensualité DRT Creation en retard. Le site sera suspendu le ' . esc_html( $s['suspendOn'] ) . ' sans paiement.'; }
	return '';
}
add_action( 'admin_notices', function () {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$t = drt_billing_notice_text( drt_billing_status() );
	if ( $t ) { echo '<div class="notice notice-error"><p><strong>DRT Creation :</strong> ' . $t . '</p></div>'; }
} );
add_action( 'wp_footer', function () {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$t = drt_billing_notice_text( drt_billing_status() );
	if ( $t ) { echo '<div style="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#b42318;color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center">' . $t . '</div>'; }
} );
