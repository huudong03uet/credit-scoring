import logging
import sys

from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from cassandra.policies import DCAwareRoundRobinPolicy


def create_session():
    """
    Thiết lập kết nối đến Cassandra và trả về đối tượng cluster và session.
    """
    # 1) Xác thực
    auth_provider = PlainTextAuthProvider(
        username='hack_cx',                # Thay bằng username thật của bạn
        password='hack_cx_9c0d1e2f3a4b5'   # Mật khẩu Cassandra
    )

    # 2) Khởi tạo Cluster với load balancing policy chỉ định datacenter
    load_balancing = DCAwareRoundRobinPolicy(local_dc='datacenter-1')
    cluster = Cluster(
        contact_points=['146.190.104.124'],  # Danh sách IP của các node
        port=9042,
        auth_provider=auth_provider,
        load_balancing_policy=load_balancing
    )

    # 3) Kết nối vào keyspace đúng
    session = cluster.connect('blockchain_etl')  # Thay 'blockchain_etl' cho schema/keyspace thực tế
    return cluster, session


def main():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s: %(message)s')
    try:
        cluster, session = create_session()
        logging.info("Kết nối thành công đến Cassandra keyspace 'blockchain_etl'.")

        # TODO: Thêm logic thao tác CQL, ví dụ truy vấn demo:
        query = "SELECT * FROM blocks LIMIT 10;"
        rows = session.execute(query)
        for row in rows:
            print(row)

    except Exception as e:
        logging.error(f"Lỗi kết nối hoặc thực thi CQL: {e}")
        sys.exit(1)

    finally:
        try:
            cluster.shutdown()
            logging.info("Cluster đã shutdown.")
        except NameError:
            pass


if __name__ == '__main__':
    main()
