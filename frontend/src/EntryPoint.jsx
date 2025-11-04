import AppRouter from "@/router/AppRouter"
import GlobalLoader from "@/components/global-loader/globalLoader"

export const EntryPoint =  () => {
  return (
    <>
      <AppRouter />
      <GlobalLoader />
    </>
  )
}