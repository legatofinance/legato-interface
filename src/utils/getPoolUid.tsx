export default function getPoolUid(version: string, poolIndex: string | number) {
  return `${version}-${poolIndex}`
}
