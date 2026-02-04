import { createPaymentProvider } from '@libs/payment'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const { orderId, provider } = query

    if (!orderId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Order ID is required'
      })
    }

    if (!provider) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Provider is required'
      })
    }

    if (provider === 'wechat') {
      // 创建微信支付提供商实例并调用取消订单方法
      const wechatProvider = createPaymentProvider('wechat')
      const success = await wechatProvider.closeOrder(orderId as string)

      if (success) {
        return { success: true, message: 'Order canceled successfully' }
      } else {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to cancel order'
        })
      }
    } else if (provider === 'stripe') {
      // TODO: 实现Stripe取消订单逻辑
      throw createError({
        statusCode: 501,
        statusMessage: 'Canceling Stripe orders is not supported yet'
      })
    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Unsupported payment provider'
      })
    }
  } catch (error: any) {
    console.error('Error canceling order:', error)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'An error occurred while canceling the order'
    })
  }
}) 