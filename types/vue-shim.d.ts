// Shim to satisfy TypeScript when root tsconfig only references Nuxt generated configs.
// This re-exports runtime-dom types so `import type { Ref } from 'vue'` works even before Nuxt build.
declare module 'vue' {
	export * from '@vue/runtime-dom';
}
