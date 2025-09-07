using WebPush;

namespace habersitesi_backend
{
    public class VapidKeyGenerator
    {
        public static void GenerateKeys()
        {
            var vapidKeys = VapidHelper.GenerateVapidKeys();
            Console.WriteLine("Public Key: " + vapidKeys.PublicKey);
            Console.WriteLine("Private Key: " + vapidKeys.PrivateKey);
        }
    }
}
