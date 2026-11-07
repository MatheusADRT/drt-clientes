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
if ( ! defined( 'DRT_BILLING_COLOR' ) ) { define( 'DRT_BILLING_COLOR', '#b56b79' ); } // cor da marca do cliente (fundo da página de pausa)

define( 'DRT_BILLING_PAGE', <<<'HTML'
<!doctype html>
<html lang="{{lang}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>{{name}}</title>
<style>
:root{--c:{{color}};--ink:#1a1518;--paper:#fbf7f4}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;display:grid;place-items:start center;overflow:hidden;position:relative}
body::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 110%,color-mix(in srgb,var(--c) 28%,transparent),transparent 60%);pointer-events:none}
main{position:relative;text-align:center;padding:0 24px 60px;max-width:560px;width:100%}
.string{width:2px;height:min(26vh,200px);margin:0 auto;background:linear-gradient(var(--ink),color-mix(in srgb,var(--ink) 40%,transparent));transform-origin:top center;animation:swing 4.2s ease-in-out infinite}
.sign{position:relative;margin:-2px auto 0;width:220px;padding:22px 20px 24px;background:var(--ink);color:var(--paper);border-radius:14px;box-shadow:0 30px 50px -20px rgba(26,21,24,.45);transform-origin:top center;animation:swing 4.2s ease-in-out infinite}
.sign::before{content:"";position:absolute;left:50%;top:-7px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:var(--paper);box-shadow:inset 0 0 0 3px var(--ink)}
.sign b{display:block;font-size:34px;line-height:1;letter-spacing:.18em;text-transform:uppercase;font-weight:800;padding-left:.18em}
.sign i{display:block;font-style:normal;font-size:12px;letter-spacing:.3em;text-transform:uppercase;opacity:.65;margin-top:10px;padding-left:.3em}
.hole{position:absolute;top:10px;width:8px;height:8px;border-radius:50%;background:var(--paper);opacity:.35}
.hole.l{left:12px}.hole.r{right:12px}
@keyframes swing{0%,100%{transform:rotate(2.2deg)}50%{transform:rotate(-2.2deg)}}
.msg{position:relative;height:7em;margin:44px 0 0}
.msg div{position:absolute;left:0;right:0;top:0;opacity:0;animation:cycle 12s infinite}
.msg div:nth-child(2){animation-delay:4s}.msg div:nth-child(3){animation-delay:8s}
.msg b{display:block;font-size:clamp(26px,5vw,36px);line-height:1.15;letter-spacing:-.02em;font-weight:700;margin-bottom:10px}
.msg p{margin:0;color:#5f5257}
@keyframes cycle{0%{opacity:0;transform:translateY(6px)}6%,30%{opacity:1;transform:none}36%,100%{opacity:0;transform:translateY(-6px)}}
.foot{position:absolute;left:0;right:0;bottom:22px;text-align:center;font-size:12px;letter-spacing:.08em;color:#8e8187}
@media (prefers-reduced-motion:reduce){.string,.sign{animation:none}.msg{height:auto}.msg div{position:static;opacity:1;animation:none;margin:0 0 22px}}
</style>
</head>
<body>
<main>
  <div class="string"></div>
  <div class="sign" aria-hidden="true"><span class="hole l"></span><span class="hole r"></span><b>Pause</b><i>{{name}}</i></div>
  <div class="msg" role="status"><div lang="fr"><b>On revient très vite.</b><p>Le site est momentanément en pause. Merci de revenir un peu plus tard.</p></div><div lang="en"><b>Back very soon.</b><p>The website is paused for the moment. Please come back a little later.</p></div><div lang="pt"><b>Voltamos logo.</b><p>O site está em pausa por enquanto. Volte um pouco mais tarde.</p></div></div>
</main>
<p class="foot">{{name}}</p>
</body>
</html>
HTML );

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
	$lang = substr( get_locale(), 0, 2 ); if ( ! in_array( $lang, array( 'fr', 'en', 'pt' ), true ) ) { $lang = 'fr'; }
	echo str_replace( array( '{{lang}}', '{{name}}', '{{color}}' ), array( $lang, $name, DRT_BILLING_COLOR ), DRT_BILLING_PAGE );
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
