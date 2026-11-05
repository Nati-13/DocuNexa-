declare module 'pako' {
  export function inflate(
    data: Uint8Array | ArrayBuffer | string,
    options?: { to?: 'string'; raw?: boolean }
  ): any;
  export function deflate(
    data: Uint8Array | ArrayBuffer | string,
    options?: any
  ): Uint8Array;
}

