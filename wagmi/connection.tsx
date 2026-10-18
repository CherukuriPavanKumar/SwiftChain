import { useConnection, useDisconnect, useEnsAvatar, useEnsName, useSwitchChain, useBalance } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { formatUnits } from 'viem'

export function Connection() {
  const { address, chainId } = useConnection()
  const { disconnect } = useDisconnect()
  const { switchChain, error: switchError, isPending: isSwitchPending } = useSwitchChain()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })
  const isSepolia = chainId === sepolia.id

  const {data: balance,isPending: isBalancePending,error: balanceError,} = useBalance({ address, chainId })

  return (
    <div>
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} width={40} height={40} />}
      <div>Wallet Address: { address }</div>
      <div>Chain ID: {chainId ?? 'Unknown'}</div>
      <div>
        {isBalancePending && <div>Loading balance...</div>}

        {balanceError && <div>Error loading balance: {balanceError.message}</div>}

        {balance && (
            <div>
                Current Balance: {formatUnits(balance.value, balance.decimals)} {balance.symbol}
            </div>
        )}
      </div>

      {!isSepolia && (
        <div>
          <p role="alert">Your wallet is not connected to Ethereum Sepolia.</p>
          <button
            type="button"
            onClick={() => switchChain({ chainId: sepolia.id })}
            disabled={isSwitchPending}
            className="bg-white p-3 text-black m-2 rounded-xl hover:text-white hover:bg-slate-900"
          >
            {isSwitchPending ? 'Switching...' : 'Switch to Sepolia'}
          </button>
          {switchError && <p role="alert">{switchError.message}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => disconnect()}
        className="bg-white p-3 text-black m-2 rounded-xl hover:text-white hover:bg-slate-900"
      >
        Disconnect
      </button>
    </div>
  )
}