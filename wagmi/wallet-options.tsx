import { useConnect, useConnectors } from 'wagmi'

export function WalletOptions() {
  const { connect, error, isPending } = useConnect()
  const connectors = useConnectors()

  if (connectors.length === 0) {
    return <p>No compatible wallet was detected. Install MetaMask to continue.</p>
  }

  return connectors.map((connector) => (
    <div key={connector.uid}>
      <button
        type="button"
        onClick={() => connect({ connector })}
        disabled={isPending}
        className="bg-white p-3 text-black m-2 rounded-xl hover:text-white hover:bg-slate-900"
      >
        {isPending ? 'Connecting...' : connector.name}
      </button>
      {error && <p role="alert">{error.message}</p>}
    </div>
  ))
}