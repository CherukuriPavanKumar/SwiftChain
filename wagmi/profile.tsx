import { useConnection, useEnsName } from 'wagmi'

export function Profile() {
  const { address } = useConnection()
  const { data, error, status } = useEnsName({ address })
  if (status === 'pending') return <div>Loading ENS name</div>
  if (status === 'error')
    return <div>Error fetching ENS name: {error.message}</div>
  return <div>
            <div>ENS name: {data}</div>
            <div>Chain ID: </div>
          </div>
}

// this is a setup testing file given by wagmi , but its not really neccesary for the application